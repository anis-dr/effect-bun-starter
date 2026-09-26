import { Mailer, renderResetPasswordEmail } from "@effect-bun-starter/email";
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
import { localeOfResetLink } from "./reset-password-link.js";
import { account, session, user, verification } from "./schema/auth-schema.js";

export class AuthReadError extends Schema.TaggedError<AuthReadError>()(
  "AuthReadError",
  {
    cause: Schema.Defect(),
  }
) {}

export type AuthenticatedUserId = string;

export class AuthDatabaseOpenError extends Schema.TaggedError<AuthDatabaseOpenError>()(
  "AuthDatabaseOpenError",
  { cause: Schema.Defect() }
) {}

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
  const databaseUrl = yield* Config.Redacted("DATABASE_URL");
  const db = yield* openAuthDatabase(databaseUrl);
  const mailer = yield* Mailer;
  const appName = yield* Config.String("APP_NAME").pipe(
    Config.withDefault("App")
  );
  // Better Auth calls back into plain promises; run mail with the layer's
  // services so its spans and logs join the app's tracing.
  const context = yield* Effect.context<never>();
  const auth = betterAuth({
    baseURL: config.baseURL,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: adapterSchema,
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
      // A reset proves control of the email; end every other session.
      revokeSessionsOnPasswordReset: true,
      // Sent in the background: awaiting it would let response time reveal
      // whether an account exists (Better Auth's advice). A failure is
      // logged; the page tells everyone the same thing.
      sendResetPassword: ({ url, user: account }) =>
        Effect.runPromiseWith(context)(
          renderResetPasswordEmail({
            appName,
            locale: localeOfResetLink(url),
            name: account.name,
            url,
          }).pipe(
            Effect.flatMap((email) => mailer.send(account.email, email)),
            Effect.catchCause((cause) =>
              Effect.logError("Reset-password email failed", cause)
            ),
            Effect.forkDetach,
            Effect.asVoid
          )
        ),
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

export class Auth extends Context.Service<
  Auth,
  {
    readonly handler: (request: Request) => Promise<Response>;
    readonly userId: (
      headers: Headers
    ) => Effect.Effect<Option.Option<AuthenticatedUserId>, AuthReadError>;
  }
>()("@effect-bun-starter/auth/Auth") {
  /** better-auth over `DATABASE_URL`, mailing through the provided Mailer. */
  static readonly layer = Layer.effect(Auth, makeAuth);
}
