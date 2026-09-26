import { Role } from "@effect-bun-starter/domain";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Effect, Option, Schema } from "effect";
import { FetchHttpClient, HttpClient } from "effect/unstable/http";

import type { Locale } from "../i18n";
import { apiBaseUrl } from "./api-client";
import { api, withCookie } from "./server-api";

/** The signed-in account as Better Auth's get-session returns it; `image`
 * is the avatar's URL, or null without one. */
const User = Schema.Struct({
  email: Schema.String,
  id: Schema.String,
  image: Schema.optional(Schema.NullOr(Schema.String)),
  name: Schema.String,
});

export const Session = Schema.Union([
  Schema.Struct({ signedIn: Schema.Literal(false) }),
  Schema.Struct({ role: Role, signedIn: Schema.Literal(true), user: User }),
]);
export type Session = typeof Session.Type;
export type SignedIn = Extract<Session, { readonly signedIn: true }>;

// Better Auth's get-session body: the session and its user, or null.
const SessionBody = Schema.NullOr(Schema.Struct({ user: User }));

const signedOut: Session = { signedIn: false };

// Better Auth's get-session: the signed-in user, or null.
const readUser = Effect.gen(function* () {
  const client = HttpClient.mapRequest(
    yield* HttpClient.HttpClient,
    withCookie
  );
  const response = yield* client.get(`${apiBaseUrl}/api/auth/get-session`);
  return yield* Schema.decodeUnknownEffect(SessionBody)(yield* response.json);
});

// The account's role (`GET /admin/session`), asked alongside the user so the
// page waits for one round trip. It answers 401 when signed out; any failure
// reads as the least-privileged role.
const readRole = api.pipe(
  Effect.flatMap((client) => client.adminSession.me()),
  Effect.map(({ role }) => role),
  Effect.orElseSucceed((): Role => "member")
);

/** The signed-in account (Better Auth's get-session) and its role, or
 * signed out. An API that can't answer reads as signed out rather than
 * breaking the page. */
const readSession = Effect.all([readUser, readRole], {
  concurrency: "unbounded",
}).pipe(
  Effect.map(([body, role]) =>
    Option.match(Option.fromNullOr(body), {
      onNone: () => signedOut,
      onSome: ({ user }): Session => ({ role, signedIn: true, user }),
    })
  ),
  Effect.orElseSucceed(() => signedOut),
  Effect.provide(FetchHttpClient.layer)
);

export const getSession = createServerFn().handler(() =>
  Effect.runPromise(readSession)
);

/** A signed-in page's loader: the session from `/$locale`, or, signed out,
 * off to sign-in, which brings the visitor back to `href`. */
export const signedInOrSignIn = (
  session: Option.Option<Session>,
  locale: Locale,
  href: string
): SignedIn =>
  Option.getOrThrowWith(
    Option.filter(session, (read): read is SignedIn => read.signedIn),
    () =>
      redirect({
        params: { locale },
        search: { redirect: href },
        to: "/$locale/sign-in",
      })
  );
