import { PgClient } from "@effect/sql-pg";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import { Cause, Config, Context, Effect, Layer, Option } from "effect";
import { SqlError } from "effect/unstable/sql";

export type DatabaseClient = PgDrizzle.EffectPgDatabase & {
  readonly $client: PgClient.PgClient;
};

const pgClientLayer = Layer.unwrap(
  Effect.gen(function* makePgClientLayer() {
    const url = yield* Config.Redacted("DATABASE_URL");

    return PgClient.layer({
      applicationName: "effect-bun-starter-api",
      url,
    });
  })
);

export class Database extends Context.Service<Database, DatabaseClient>()(
  "@effect-bun-starter/database/Database"
) {
  /** Drizzle over `DATABASE_URL`. */
  static readonly layer = Layer.effect(
    Database,
    PgDrizzle.make().pipe(Effect.provide(PgDrizzle.DefaultServices))
  ).pipe(Layer.provide(pgClientLayer));
}

/** True when a query failed on the named unique constraint. */
export const isUniqueViolation = (
  error: { readonly cause?: unknown },
  constraint: string
) => {
  if (!Cause.isCause(error.cause)) return false;
  const sqlError = Cause.findErrorOption(error.cause);
  return (
    Option.isSome(sqlError) &&
    SqlError.isSqlError(sqlError.value) &&
    sqlError.value.reason._tag === "UniqueViolation" &&
    sqlError.value.reason.constraint === constraint
  );
};
