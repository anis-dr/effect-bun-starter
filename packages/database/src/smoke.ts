import { sql } from "drizzle-orm";
import { Effect } from "effect";

import { Database } from "./database.js";

interface SmokeResult extends Record<string, unknown> {
  readonly ok: 1;
}

const check = Effect.fn("DatabaseSmoke.check")(function* checkDatabase() {
  const db = yield* Database;
  const rows = yield* db.execute<SmokeResult>(sql`SELECT 1 AS ok`);
  const [first] = rows;

  if (first?.ok !== 1) {
    return yield* Effect.die(
      new Error("Database smoke check returned an unexpected result")
    );
  }

  return first;
});

export const DatabaseSmoke = { check };
