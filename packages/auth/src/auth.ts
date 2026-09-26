import {
  type LinkEmailProps,
  Mailer,
  type RenderedEmail,
  renderResetPasswordEmail,
  renderVerifyEmail,
} from "@effect-bun-starter/email";
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
import { localeOfLink } from "./link-locale.js";
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
  /** Mails `render`'s email for the link `url` to `account`, in the
   * background: awaiting it would let response time reveal whether an
   * account exists (Better Auth's advice). A failure is logged; the page
   * tells everyone the same thing. */
  const mailLink =
    (
      render: (
        props: LinkEmailProps
      ) => Effect.Effect<RenderedEmail, never, never>
    ) =>
    ({
      url,
      user: account,
    }: {
      readonly url: string;
      readonly user: { readonly email: string; readonly name: string };
    }) =>
      Effect.runPromiseWith(context)(
        render({
          appName,
          locale: localeOfLink(url),
          name: account.name,
          url,
        }).pipe(
          Effect.flatMap((email) => mailer.send(account.email, email)),
          Effect.catchCause((cause) =>
            Effect.logError("Link email failed", cause)
          ),
          Effect.forkDetach,
          Effect.asVoid
        )
      );
  const auth = betterAuth({
    advanced: { crossSubDomainCookies: config.crossSubDomainCookies },
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
      sendResetPassword: mailLink(renderResetPasswordEmail),
    },
    // Proves the account owns its address; sign-in doesn't wait for it, but
    // roles picked by email (the superadmin, appointed admins) do.
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: mailLink(renderVerifyEmail),
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
