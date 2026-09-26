import { createAuthClient } from "better-auth/react";
import { Cause, Effect, Option, Schema } from "effect";

import type { Copy } from "../i18n";
import { apiBaseUrl } from "./api-client";

export const authClient = createAuthClient({
  basePath: "/api/auth",
  baseURL: apiBaseUrl,
  // Refusals reject instead of resolving as `{ error }`, so `authCall` has
  // one failure path.
  fetchOptions: { throw: true },
});

const RefusalCode = Schema.Literals([
  "INVALID_EMAIL",
  "INVALID_EMAIL_OR_PASSWORD",
  "INVALID_TOKEN",
  "PASSWORD_TOO_LONG",
  "PASSWORD_TOO_SHORT",
  "TOO_MANY_REQUESTS",
  "USER_ALREADY_EXISTS",
  "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
]);
type RefusalCode = typeof RefusalCode.Type;

/**
 * Better Auth refusals a person can act on, and the copy that says so. The
 * API's own `message` is English, so pages never show it; any other failure
 * falls back to the page's generic line.
 */
const refusalCopy = {
  INVALID_EMAIL: "emailInvalid",
  INVALID_EMAIL_OR_PASSWORD: "authInvalidCredentials",
  INVALID_TOKEN: "resetLinkInvalidDescription",
  PASSWORD_TOO_LONG: "authPasswordTooLong",
  PASSWORD_TOO_SHORT: "passwordRequired",
  TOO_MANY_REQUESTS: "authTooManyAttempts",
  USER_ALREADY_EXISTS: "authAccountExists",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "authAccountExists",
} satisfies Record<RefusalCode, keyof Copy>;

/** A Better Auth request that failed, with the refusal's code when it is one
 * the pages explain. */
export class AuthError extends Schema.TaggedError<AuthError>()("AuthError", {
  code: Schema.Option(RefusalCode),
}) {}

// What a refusal carries: Better Fetch's error with the API's JSON body, or
// the rate limiter's 429, which has no code.
const CodedRefusal = Schema.Struct({
  error: Schema.Struct({ code: RefusalCode }),
});
const RateLimited = Schema.Struct({ status: Schema.Literal(429) });

/** The `AuthError` for whatever a Better Auth call rejected with. */
export const authFailure = (cause: unknown) =>
  new AuthError({
    code: Option.orElse(
      Option.map(
        Schema.decodeUnknownOption(CodedRefusal)(cause),
        (refusal) => refusal.error.code
      ),
      () =>
        Option.map(
          Schema.decodeUnknownOption(RateLimited)(cause),
          (): RefusalCode => "TOO_MANY_REQUESTS"
        )
    ),
  });

/** A Better Auth client call as an Effect. */
export const authCall = <A>(call: () => Promise<A>) =>
  Effect.tryPromise({ catch: authFailure, try: call }).pipe(
    Effect.asVoid,
    Effect.withSpan("Account.authCall")
  );

/** What to tell the person, in the page's language: the refusal's own line
 * when the pages explain it, else `fallback`. */
export const authFailureMessage = (
  copy: Copy,
  cause: Cause.Cause<AuthError>,
  fallback: string
): string =>
  Cause.findErrorOption(cause).pipe(
    Option.flatMap((failure) => failure.code),
    Option.match({
      onNone: () => fallback,
      onSome: (code) => copy[refusalCopy[code]],
    })
  );
