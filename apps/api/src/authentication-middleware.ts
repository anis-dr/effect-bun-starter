import { Auth } from "@effect-bun-starter/auth";
import { Database, eq, sql, user } from "@effect-bun-starter/database";
import {
  Authentication,
  AuthenticationUnavailable,
  CurrentAccount,
  makePermix,
  permix,
  type Role,
  Unauthorized,
} from "@effect-bun-starter/domain";
import { Config, Effect, Layer, Option } from "effect";
import { HttpServerRequest } from "effect/unstable/http";

/** Logs a session or database failure and answers 503. */
const unavailable = Effect.fn("Authentication.unavailable")(function* (
  cause: unknown
) {
  yield* Effect.logError("Authentication dependency failed", cause);
  return yield* new AuthenticationUnavailable({
    message: "Authentication unavailable",
  });
});

const unauthorized = () =>
  new Unauthorized({ message: "Authentication required" });

/** The one account treated as superadmin; unset means none. */
const superadminEmailConfig = Config.option(
  Config.String("SUPERADMIN_EMAIL").pipe(
    Config.map((email) => email.trim().toLowerCase())
  )
);

/** An account's role, most powerful first. Better Auth stores emails in
 * lower case. The superadmin's email must be verified: anyone can sign up
 * with any address, and only the verification link proves who owns it.
 * The subquery names its tables in full: Drizzle drops the qualifier on
 * single-table selects, which would make `id` ambiguous. */
const roleOf = (superadminEmail: Option.Option<string>) =>
  sql<Role>`case
    when ${Option.match(superadminEmail, {
      onNone: () => sql`false`,
      onSome: (email) =>
        sql`${user.email} = ${email} and ${user.emailVerified}`,
    })} then 'superadmin'
    when exists (select 1 from "admins" where "admins"."user_id" = "user"."id") then 'admin'
    else 'member' end`;

export const authenticationLayer = Layer.effect(
  Authentication,
  Effect.gen(function* makeAuthentication() {
    const auth = yield* Auth;
    const db = yield* Database;
    const superadminEmail = yield* superadminEmailConfig;

    return (httpEffect) =>
      Effect.gen(function* authenticate() {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const webRequest = yield* HttpServerRequest.toWeb(request).pipe(
          Effect.catch(unavailable)
        );
        const session = yield* auth
          .userId(webRequest.headers)
          .pipe(Effect.catch(unavailable));
        const userId = yield* session.pipe(Effect.fromOption(unauthorized));
        const [account] = yield* db
          .select({ role: roleOf(superadminEmail) })
          .from(user)
          .where(eq(user.id, userId))
          .pipe(Effect.catch(unavailable));
        const { role } = yield* Option.fromUndefinedOr(account).pipe(
          Effect.fromOption(unauthorized)
        );

        return yield* httpEffect.pipe(
          Effect.provideService(CurrentAccount, { role, userId }),
          // A fresh Permix per request: its rules are this account's role.
          Effect.provideService(permix.Tag, makePermix(role))
        );
      }).pipe(Effect.withSpan("Authentication.authenticate"));
  })
);
