import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import { Config, Effect, Layer, Redacted, Schema } from "effect";
import { HttpEffect, HttpRouter } from "effect/unstable/http";
import { Pool } from "pg";

import { loadAuthConfig } from "./auth-config.js";
import { account, session, user, verification } from "./schema/auth-schema.js";

export class AuthDatabaseOpenError extends Schema.TaggedErrorClass<AuthDatabaseOpenError>()(
  "AuthDatabaseOpenError",
  { cause: Schema.Defect() }
) {}

const adapterSchema = { account, session, user, verification };

const openAuthDatabase = (databaseUrl: Redacted.Redacted<string>) => {
  const acquire = Effect.try({
    catch: (cause) => new AuthDatabaseOpenError({ cause }),
    try: () => {
      const pool = new Pool({ connectionString: Redacted.value(databaseUrl) });
      return { db: drizzle({ client: pool }), pool };
    },
  });

  return Effect.acquireRelease(acquire, ({ pool }) =>
    Effect.promise(() => pool.end())
  ).pipe(Effect.map(({ db }) => db));
};

const makeAuth = Effect.gen(function* makeAuth() {
  const config = yield* loadAuthConfig;
  const databaseUrl = yield* Config.redacted("DATABASE_URL");
  const db = yield* openAuthDatabase(databaseUrl);

  return betterAuth({
    baseURL: config.baseURL,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: adapterSchema,
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
    },
    secret: config.secret,
  });
});

export const AuthRoutesLive = Layer.unwrap(
  makeAuth.pipe(
    Effect.map(({ handler }) =>
      HttpRouter.add("*", "/api/auth/*", HttpEffect.fromWebHandler(handler))
    )
  )
);
