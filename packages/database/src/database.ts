import { PgClient } from "@effect/sql-pg";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import { Config, Context, Effect, Layer } from "effect";

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
