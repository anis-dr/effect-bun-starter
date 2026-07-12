import { PgClient } from "@effect/sql-pg";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import { Config, Context, Effect, Layer } from "effect";

export type DatabaseClient = PgDrizzle.EffectPgDatabase & {
  readonly $client: PgClient.PgClient;
};

export class Database extends Context.Service<Database, DatabaseClient>()(
  "@effect-bun-starter/database/Database"
) {}

const PgClientLive = Layer.unwrap(
  Effect.gen(function* makePgClientLayer() {
    const url = yield* Config.redacted("DATABASE_URL");

    return PgClient.layer({
      applicationName: "effect-bun-starter-api",
      url,
    });
  })
);

export const DatabaseLive = Layer.effect(
  Database,
  PgDrizzle.make().pipe(Effect.provide(PgDrizzle.DefaultServices))
).pipe(Layer.provide(PgClientLive));
