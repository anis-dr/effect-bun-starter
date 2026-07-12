import { Database, DatabaseLive } from "@effect-bun-starter/database";
import { describe, expect, it } from "@effect/vitest";
import type { BetterAuthOptions } from "better-auth";
import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { Effect } from "effect";

import { effectDrizzleAdapter } from "../src/auth-adapter.js";

const widget = pgTable("widget", {
  count: integer("count"),
  id: text("id").primaryKey(),
  name: text("name"),
  remaining: integer("remaining"),
  tag: text("tag"),
});

const widgetPlugin = {
  id: "widget-test",
  schema: {
    widget: {
      fields: {
        count: { required: false, type: "number" as const },
        name: { required: false, type: "string" as const },
        remaining: { required: false, type: "number" as const },
        tag: { required: false, type: "string" as const },
      },
    },
  },
};

const authOptions = {
  plugins: [widgetPlugin],
  secret: "test-secret-that-is-at-least-32-chars-long",
} satisfies BetterAuthOptions;

const setupAdapter = Effect.fn("setupAdapter")(function* setupAdapter() {
  const db = yield* Database;
  const context = yield* Effect.context<never>();
  const sql = db.$client.withoutTransforms();

  yield* sql.unsafe(`DROP TABLE IF EXISTS "widget"`);
  yield* sql.unsafe(`
    CREATE TABLE "widget" (
      "id" text PRIMARY KEY,
      "name" text,
      "tag" text,
      "count" integer,
      "remaining" integer
    )
  `);

  return effectDrizzleAdapter(
    db,
    {
      provider: "pg",
      schema: { widget },
      transaction: true,
    },
    context
  )(authOptions);
});

describe("auth database adapter", () => {
  it.effect("creates and queries rows", () =>
    Effect.gen(function* createsAndQueriesRows() {
      const adapter = yield* setupAdapter();

      const created = yield* Effect.promise(() =>
        adapter.create({
          data: { count: 5, id: "1", name: "alice" },
          forceAllowId: true,
          model: "widget",
        })
      );

      expect(created).toMatchObject({ count: 5, id: "1", name: "alice" });

      const found = yield* Effect.promise(() =>
        adapter.findOne<{ id: string; name: string }>({
          model: "widget",
          where: [{ field: "id", value: "1" }],
        })
      );
      expect(found).toMatchObject({ id: "1", name: "alice" });

      const total = yield* Effect.promise(() =>
        adapter.count({
          model: "widget",
          where: [{ field: "name", value: "alice" }],
        })
      );
      expect(total).toBe(1);
    }).pipe(Effect.provide(DatabaseLive))
  );

  it.effect("keeps singular update and delete empty predicates as no-ops", () =>
    Effect.gen(function* keepsEmptyPredicatesNoop() {
      const adapter = yield* setupAdapter();
      yield* Effect.promise(() =>
        adapter.create({
          data: { id: "1", name: "alice" },
          forceAllowId: true,
          model: "widget",
        })
      );
      yield* Effect.promise(() =>
        adapter.create({
          data: { id: "2", name: "bob" },
          forceAllowId: true,
          model: "widget",
        })
      );

      const updated = yield* Effect.promise(() =>
        adapter.update({
          model: "widget",
          update: { name: "overwritten" },
          where: [],
        })
      );
      expect(updated).toBeNull();

      yield* Effect.promise(() =>
        adapter.delete({ model: "widget", where: [] })
      );

      const rows = yield* Effect.promise(() =>
        adapter.findMany<{ id: string; name: string }>({
          model: "widget",
          sortBy: { direction: "asc", field: "name" },
        })
      );
      expect(rows.map((row) => row.name)).toEqual(["alice", "bob"]);
    }).pipe(Effect.provide(DatabaseLive))
  );

  it.effect("returns affected-row counts for bulk mutations", () =>
    Effect.gen(function* returnsBulkMutationCounts() {
      const adapter = yield* setupAdapter();
      for (const id of ["1", "2", "3"]) {
        yield* Effect.promise(() =>
          adapter.create({
            data: { id, name: id },
            forceAllowId: true,
            model: "widget",
          })
        );
      }

      const updated = yield* Effect.promise(() =>
        adapter.updateMany({
          model: "widget",
          update: { tag: "grouped" },
          where: [
            { connector: "OR", field: "id", value: "1" },
            { connector: "OR", field: "id", value: "2" },
          ],
        })
      );
      expect(updated).toBe(2);

      const deleted = yield* Effect.promise(() =>
        adapter.deleteMany({
          model: "widget",
          where: [{ field: "tag", value: "grouped" }],
        })
      );
      expect(deleted).toBe(2);
    }).pipe(Effect.provide(DatabaseLive))
  );

  it.effect("consumes only one matching row", () =>
    Effect.gen(function* consumesOnlyOneRow() {
      const adapter = yield* setupAdapter();
      for (const id of ["1", "2"]) {
        yield* Effect.promise(() =>
          adapter.create({
            data: { id, tag: "token" },
            forceAllowId: true,
            model: "widget",
          })
        );
      }

      const consumed = yield* Effect.promise(() =>
        adapter.consumeOne<{ id: string; tag: string }>({
          model: "widget",
          where: [{ field: "tag", value: "token" }],
        })
      );
      expect(consumed?.tag).toBe("token");

      const remaining = yield* Effect.promise(() =>
        adapter.count({
          model: "widget",
          where: [{ field: "tag", value: "token" }],
        })
      );
      expect(remaining).toBe(1);
    }).pipe(Effect.provide(DatabaseLive))
  );

  it.effect(
    "increments a guarded row and returns null when the guard misses",
    () =>
      Effect.gen(function* incrementsGuardedRow() {
        const adapter = yield* setupAdapter();
        yield* Effect.promise(() =>
          adapter.create({
            data: { count: 5, id: "1", remaining: 0 },
            forceAllowId: true,
            model: "widget",
          })
        );

        const incremented = yield* Effect.promise(() =>
          adapter.incrementOne<{ count: number; tag: string }>({
            increment: { count: 3 },
            model: "widget",
            set: { tag: "touched" },
            where: [{ field: "id", value: "1" }],
          })
        );
        expect(incremented).toMatchObject({ count: 8, tag: "touched" });

        const missed = yield* Effect.promise(() =>
          adapter.incrementOne<{ remaining: number }>({
            increment: { remaining: -1 },
            model: "widget",
            where: [
              { field: "id", value: "1" },
              { field: "remaining", operator: "gt", value: 0 },
            ],
          })
        );
        expect(missed).toBeNull();
      }).pipe(Effect.provide(DatabaseLive))
  );
});
