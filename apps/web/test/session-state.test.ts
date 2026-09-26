import { assert, it } from "@effect/vitest";
import { isRedirect } from "@tanstack/react-router";
import { Effect, Option } from "effect";

import { type Session, signedInOrSignIn } from "../src/lib/session-state.js";
import { getRouter } from "../src/router.js";

const member: Session = {
  role: "member",
  signedIn: true,
  user: {
    email: "ada@example.com",
    emailVerified: true,
    id: "user-1",
    name: "Ada",
  },
};

/** Where a signed-in page's loader sends the visitor: the address the
 * router goes to, or none when the page renders. */
const sentTo = (session: Option.Option<Session>, href: string) =>
  Effect.try({
    catch: (thrown) => Option.liftPredicate(thrown, isRedirect),
    try: () => signedInOrSignIn(session, "fr", href),
  }).pipe(
    Effect.match({
      onFailure: (redirect) =>
        Option.map(
          redirect,
          (sent) => getRouter().buildLocation(sent.options).href
        ),
      onSuccess: Option.none,
    })
  );

it.effect.each([
  ["/fr/account", "/fr/sign-in?redirect=%2Ffr%2Faccount"],
  ["/fr/admin?tab=admins", "/fr/sign-in?redirect=%2Ffr%2Fadmin%3Ftab%3Dadmins"],
] satisfies ReadonlyArray<readonly [string, string]>)(
  "sends a signed-out visit to %s to sign-in and back",
  ([href, signIn]) =>
    Effect.gen(function* () {
      assert.deepStrictEqual(
        yield* sentTo(Option.some({ signedIn: false }), href),
        Option.some(signIn)
      );
      // A session the API couldn't answer for reads the same.
      assert.deepStrictEqual(
        yield* sentTo(Option.none(), href),
        Option.some(signIn)
      );
    })
);

it.effect("lets a signed-in account through", () =>
  Effect.gen(function* () {
    assert.deepStrictEqual(
      yield* sentTo(Option.some(member), "/fr/admin"),
      Option.none()
    );
  })
);
