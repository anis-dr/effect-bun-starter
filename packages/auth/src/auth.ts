import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  Config,
  Context,
  Effect,
  Layer,
  Option,
  Redacted,
  Schema,
} from "effect";
import { Pool } from "pg";

import { loadAuthConfig } from "./auth-config.js";
import { account, session, user, verification } from "./schema/auth-schema.js";

export class AuthReadError extends Schema.TaggedErrorClass<AuthReadError>()(
  "AuthReadError",
  {
    cause: Schema.Defect(),
  }
) {}

export type AuthenticatedUserId = string;

export class AuthDatabaseOpenError extends Schema.TaggedErrorClass<AuthDatabaseOpenError>()(
  "AuthDatabaseOpenError",
  { cause: Schema.Defect() }
) {}
export class Auth extends Context.Service<
  Auth,
  {
    readonly handler: (request: Request) => Promise<Response>;
    readonly userId: (
      headers: Headers
    ) => Effect.Effect<Option.Option<AuthenticatedUserId>, AuthReadError>;
  }
>()("@effect-bun-starter/auth/Auth") {}

const adapterSchema = { account, session, user, verification };

function openAuthDatabase(databaseUrl: Redacted.Redacted<string>) {
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
}

const makeAuth = Effect.gen(function* makeAuth() {
  const config = yield* loadAuthConfig;
  const databaseUrl = yield* Config.redacted("DATABASE_URL");
  const db = yield* openAuthDatabase(databaseUrl);
  const auth = betterAuth({
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
    trustedOrigins: config.trustedOrigins,
  });

  return {
    handler: auth.handler,
    userId: Effect.fn("Auth.userId")((headers: Headers) =>
      Effect.tryPromise({
        catch: (cause) => new AuthReadError({ cause }),
        try: () => auth.api.getSession({ headers }),
      }).pipe(
        Effect.map((activeSession) =>
          Option.map(
            Option.fromNullishOr(activeSession),
            ({ user: authenticatedUser }) => authenticatedUser.id
          )
        )
      )
    ),
  };
});

export const AuthLive = Layer.effect(Auth, makeAuth);
