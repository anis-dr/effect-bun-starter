import type { DatabaseClient } from "@effect-bun-starter/database";
import type { BetterAuthOptions } from "better-auth";
import { createAdapterFactory } from "better-auth/adapters";
import type {
  CleanedWhere,
  CustomAdapter,
  DBAdapter,
  DBAdapterDebugLogOption,
  DBAdapterInstance,
  DBTransactionAdapter,
} from "better-auth/adapters";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { Effect } from "effect";
import type { Context } from "effect";

type Row = Record<string, unknown>;
type DrizzleTable = Record<string, unknown>;
type DrizzleSchema = Record<string, unknown>;
type Query<A> = Effect.Effect<A, unknown, never>;
type RunQuery = <A>(query: Query<A>) => Promise<A>;

type SelectQuery = Query<readonly Row[]> & {
  readonly for?: (strength: "update") => SelectQuery;
  readonly limit: (limit: number) => SelectQuery;
  readonly offset: (offset: number) => SelectQuery;
  readonly orderBy: (orderBy: unknown) => SelectQuery;
  readonly where: (where: SQL | undefined) => SelectQuery;
};

interface EffectDrizzleDb {
  readonly _: { readonly fullSchema?: DrizzleSchema };
  readonly delete: (table: DrizzleTable) => {
    readonly where: (where: SQL | undefined) => {
      readonly returning: (
        fields?: Record<string, unknown>
      ) => Query<readonly Row[]>;
    };
  };
  readonly insert: (table: DrizzleTable) => {
    readonly values: (values: Record<string, unknown>) => {
      readonly returning: (
        fields?: Record<string, unknown>
      ) => Query<readonly Row[]>;
    };
  };
  readonly select: (fields?: Record<string, unknown>) => {
    readonly from: (table: DrizzleTable) => SelectQuery;
  };
  readonly transaction: <A>(
    work: (transaction: EffectDrizzleDb) => Query<A>
  ) => Query<A>;
  readonly update: (table: DrizzleTable) => {
    readonly set: (values: Record<string, unknown>) => {
      readonly where: (where: SQL | undefined) => {
        readonly returning: (
          fields?: Record<string, unknown>
        ) => Query<readonly Row[]>;
      };
    };
  };
}

const comparisons = {
  gt,
  gte,
  lt,
  lte,
};

export interface EffectDrizzleAdapterConfig {
  readonly camelCase?: boolean;
  readonly debugLogs?: DBAdapterDebugLogOption;
  readonly provider: "pg";
  readonly schema?: DrizzleSchema;
  readonly transaction?: boolean;
  readonly usePlural?: boolean;
}

const first = <T>(rows: readonly T[]) => rows[0] ?? null;

const condition = (
  schemaModel: DrizzleTable,
  where: CleanedWhere,
  model: string
) => {
  const column = schemaModel[where.field];
  if (!column) {
    throw new Error(
      `The field "${where.field}" does not exist in the schema for the model "${model}".`
    );
  }

  const operator = where.operator ?? "eq";
  const insensitive =
    where.mode === "insensitive" && typeof where.value === "string";

  if (operator === "in" || operator === "not_in") {
    if (!Array.isArray(where.value)) {
      throw new TypeError(`The value for "${where.field}" must be an array.`);
    }
    return operator === "in"
      ? inArray(column as never, where.value)
      : notInArray(column as never, where.value);
  }

  if (operator === "contains") {
    const pattern = `%${where.value}%`;
    return insensitive
      ? ilike(column as never, pattern)
      : like(column as never, pattern);
  }

  if (operator === "starts_with") {
    const pattern = `${where.value}%`;
    return insensitive
      ? ilike(column as never, pattern)
      : like(column as never, pattern);
  }

  if (operator === "ends_with") {
    const pattern = `%${where.value}`;
    return insensitive
      ? ilike(column as never, pattern)
      : like(column as never, pattern);
  }

  if (operator in comparisons) {
    return comparisons[operator as keyof typeof comparisons](
      column as never,
      where.value
    );
  }

  if (operator === "ne") {
    if (where.value === null) {
      return isNotNull(column as never);
    }
    return ne(column as never, where.value);
  }

  if (where.value === null) {
    return isNull(column as never);
  }

  return eq(column as never, where.value);
};

const whereSql = (
  schemaModel: DrizzleTable,
  where: CleanedWhere[] | undefined,
  model: string
) => {
  if (!where?.length) {
    return;
  }

  const andGroup = where
    .filter((item) => item.connector !== "OR")
    .map((item) => condition(schemaModel, item, model));
  const orGroup = where
    .filter((item) => item.connector === "OR")
    .map((item) => condition(schemaModel, item, model));

  if (andGroup.length && orGroup.length) {
    return and(and(...andGroup), or(...orGroup));
  }
  if (andGroup.length) {
    return and(...andGroup);
  }
  return or(...orGroup);
};

const selected = (schemaModel: DrizzleTable, fields?: string[]) =>
  fields?.length
    ? Object.fromEntries(fields.map((field) => [field, schemaModel[field]]))
    : undefined;

const getSchema = (
  db: EffectDrizzleDb,
  config: EffectDrizzleAdapterConfig,
  model: string
) => {
  const schema = config.schema ?? db._.fullSchema;
  const schemaModel = schema?.[model] as DrizzleTable | undefined;
  if (!schemaModel) {
    throw new Error(
      `The model "${model}" was not found in the Drizzle schema.`
    );
  }
  return schemaModel;
};

const makeCustomAdapter = (
  db: EffectDrizzleDb,
  config: EffectDrizzleAdapterConfig,
  run: RunQuery
): CustomAdapter => ({
  async count({ model, where }) {
    const schemaModel = getSchema(db, config, model);
    const rows = await run(
      db
        .select({ count: count() })
        .from(schemaModel)
        .where(whereSql(schemaModel, where, model))
    );
    return Number(first(rows)?.count ?? 0);
  },
  async create({ data, model, select }) {
    const schemaModel = getSchema(db, config, model);
    const rows = await run(
      db
        .insert(schemaModel)
        .values(data)
        .returning(selected(schemaModel, select))
    );
    return (first(rows) ?? data) as typeof data;
  },
  async delete({ model, where }) {
    if (where.length === 0) {
      return;
    }
    const schemaModel = getSchema(db, config, model);
    await run(
      db
        .delete(schemaModel)
        .where(whereSql(schemaModel, where, model))
        .returning()
    );
  },
  async deleteMany({ model, where }) {
    const schemaModel = getSchema(db, config, model);
    const rows = await run(
      db
        .delete(schemaModel)
        .where(whereSql(schemaModel, where, model))
        .returning({ affected: sql`1` })
    );
    return rows.length;
  },
  async findMany({ join, limit, model, offset, select, sortBy, where }) {
    if (join && Object.keys(join).length > 0) {
      // ponytail: Better Auth joins are experimental; add them when enabled.
      throw new Error("Better Auth joins are not supported by this adapter");
    }

    const schemaModel = getSchema(db, config, model);
    let query = db
      .select(selected(schemaModel, select))
      .from(schemaModel)
      .where(whereSql(schemaModel, where, model));

    if (sortBy?.field) {
      const column = schemaModel[sortBy.field];
      if (!column) {
        throw new Error(
          `The field "${sortBy.field}" does not exist in "${model}".`
        );
      }
      query = query.orderBy(
        sortBy.direction === "desc"
          ? desc(column as never)
          : asc(column as never)
      );
    }

    if (typeof limit === "number") {
      query = query.limit(limit);
    }

    if (typeof offset === "number") {
      query = query.offset(offset);
    }

    return [...(await run(query))] as never[];
  },
  async findOne({ join, model, select, where }) {
    if (join && Object.keys(join).length > 0) {
      throw new Error("Better Auth joins are not supported by this adapter");
    }

    const schemaModel = getSchema(db, config, model);
    const rows = await run(
      db
        .select(selected(schemaModel, select))
        .from(schemaModel)
        .where(whereSql(schemaModel, where, model))
        .limit(1)
    );
    return first(rows) as never;
  },
  async incrementOne({ increment, model, set, where }) {
    if (where.length === 0) {
      return null;
    }

    const schemaModel = getSchema(db, config, model);
    const idColumn = schemaModel.id;
    if (!idColumn) {
      return null;
    }

    const updates: Record<string, unknown> = {};
    for (const [field, delta] of Object.entries(increment)) {
      const column = schemaModel[field];
      if (!column) {
        throw new Error(`The field "${field}" does not exist in "${model}".`);
      }
      updates[field] = sql`coalesce(${column}, 0) + ${delta}`;
    }
    Object.assign(updates, set);

    const targetIds = db
      .select({ id: idColumn })
      .from(schemaModel)
      .where(whereSql(schemaModel, where, model))
      .limit(1);
    const rows = await run(
      db
        .update(schemaModel)
        .set(updates)
        .where(inArray(idColumn as never, targetIds as never))
        .returning()
    );
    return first(rows) as never;
  },
  options: config,
  async update({ model, update, where }) {
    const values = update as Record<string, unknown>;
    if (where.length === 0 || Object.keys(values).length === 0) {
      return null;
    }

    const schemaModel = getSchema(db, config, model);
    const rows = await run(
      db
        .update(schemaModel)
        .set(values)
        .where(whereSql(schemaModel, where, model))
        .returning()
    );
    return first(rows) as never;
  },
  async updateMany({ model, update, where }) {
    const values = update as Record<string, unknown>;
    if (Object.keys(values).length === 0) {
      return 0;
    }

    const schemaModel = getSchema(db, config, model);
    const rows = await run(
      db
        .update(schemaModel)
        .set(values)
        .where(whereSql(schemaModel, where, model))
        .returning({ affected: sql`1` })
    );
    return rows.length;
  },
});

export const effectDrizzleAdapter = (
  inputDb: DatabaseClient,
  config: EffectDrizzleAdapterConfig,
  context: Context.Context<never>
): DBAdapterInstance<BetterAuthOptions> => {
  const db = inputDb as unknown as EffectDrizzleDb;
  const run: RunQuery = Effect.runPromiseWith(context);
  let options: BetterAuthOptions | undefined;

  const makeAdapter = (
    client: EffectDrizzleDb,
    transaction: boolean
  ): DBAdapter<BetterAuthOptions> =>
    createAdapterFactory<BetterAuthOptions>({
      adapter: () => makeCustomAdapter(client, config, run),
      config: {
        adapterId: "drizzle",
        adapterName: "Effect Bun Starter Effect Drizzle",
        debugLogs: config.debugLogs ?? false,
        supportsArrays: true,
        supportsBooleans: true,
        supportsDates: true,
        supportsJSON: true,
        supportsUUIDs: true,
        transaction: transaction
          ? async (work) =>
              await run(
                client.transaction((transactionClient) =>
                  Effect.promise(() =>
                    work(
                      makeAdapter(
                        transactionClient,
                        false
                      ) as DBTransactionAdapter<BetterAuthOptions>
                    )
                  )
                )
              )
          : false,
        usePlural: config.usePlural ?? false,
      },
    })(options ?? {});

  return (authOptions) => {
    options = authOptions;
    return makeAdapter(db, config.transaction ?? false);
  };
};
