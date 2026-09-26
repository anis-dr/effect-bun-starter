import { createServerFn } from "@tanstack/react-start";
import { Effect, Option, Schema } from "effect";
import { FetchHttpClient, HttpClient } from "effect/unstable/http";

import { apiBaseUrl } from "./api-client";
import { withCookie } from "./server-api";

const User = Schema.Struct({ id: Schema.String, name: Schema.String });

export const Session = Schema.Union([
  Schema.Struct({ signedIn: Schema.Literal(false) }),
  Schema.Struct({ signedIn: Schema.Literal(true), user: User }),
]);
export type Session = typeof Session.Type;

// Better Auth's get-session body: the session and its user, or null.
const SessionBody = Schema.NullOr(Schema.Struct({ user: User }));

const signedOut: Session = { signedIn: false };

/** The signed-in account (Better Auth's get-session), or signed out. An API
 * that can't answer reads as signed out rather than breaking the page. */
const readSession = Effect.gen(function* () {
  const client = HttpClient.mapRequest(
    yield* HttpClient.HttpClient,
    withCookie
  );
  const response = yield* client.get(`${apiBaseUrl}/api/auth/get-session`);
  const body = yield* Schema.decodeUnknownEffect(SessionBody)(
    yield* response.json
  );
  return Option.match(Option.fromNullOr(body), {
    onNone: () => signedOut,
    onSome: ({ user }): Session => ({ signedIn: true, user }),
  });
}).pipe(
  Effect.orElseSucceed(() => signedOut),
  Effect.provide(FetchHttpClient.layer)
);

export const getSession = createServerFn().handler(() =>
  Effect.runPromise(readSession)
);
