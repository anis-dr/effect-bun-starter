import { Database, inArray, user } from "@effect-bun-starter/database";
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { TestApp, encodeJson, mailTo, signUp } from "./test-app.js";

const post = Effect.fn("PasswordResetTest.post")(function* (
  path: string,
  body: Readonly<Record<string, string>>
) {
  const app = yield* TestApp;
  return yield* app.request(
    new Request(`http://localhost:3002${path}`, {
      body: encodeJson(body),
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      method: "POST",
    })
  );
});

// The real clock: the wait for the background mail sleeps.
layer(Layer.merge(TestApp.layer, Database.layer), {
  excludeTestServices: true,
})((it) => {
  it.effect(
    "mails a reset link in the page's language that sets a new password and ends other sessions",
    () =>
      Effect.gen(function* () {
        const app = yield* TestApp;
        const db = yield* Database;
        const email = `reset-${globalThis.crypto.randomUUID().slice(0, 8)}@example.com`;
        yield* Effect.addFinalizer(() =>
          Effect.orDie(db.delete(user).where(inArray(user.email, [email])))
        );
        const account = yield* signUp(email);

        const requested = yield* post("/api/auth/request-password-reset", {
          email,
          redirectTo: "http://localhost:3000/fr/reset-password",
        });
        assert.strictEqual(requested.status, 200);

        const mails = yield* mailTo(email, "Réinitialisez votre mot de passe");
        assert.strictEqual(mails.length, 1);
        const [mail] = mails;
        assert.isDefined(mail);
        assert.strictEqual(
          mail.email.subject,
          "Réinitialisez votre mot de passe"
        );
        const link = Option.fromNullishOr(
          /http:\/\/localhost:3002\/api\/auth\/reset-password\/[^\s\]]+/u.exec(
            mail.email.text
          )
        ).pipe(Option.map(([url]) => new URL(url)));
        assert(Option.isSome(link));
        assert.strictEqual(
          link.value.searchParams.get("callbackURL"),
          "http://localhost:3000/fr/reset-password"
        );
        const token = link.value.pathname.slice(
          "/api/auth/reset-password/".length
        );

        const reset = yield* post("/api/auth/reset-password", {
          newPassword: "Changed456!pw",
          token,
        });
        assert.strictEqual(reset.status, 200);

        const oldSession = yield* app.request(
          new Request("http://localhost:3002/admin/session", {
            headers: { cookie: account.cookie },
          })
        );
        assert.strictEqual(oldSession.status, 401);
        const signIn = yield* post("/api/auth/sign-in/email", {
          email,
          password: "Changed456!pw",
        });
        assert.strictEqual(signIn.status, 200);
      })
  );
});
