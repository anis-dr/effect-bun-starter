import { Auth, AuthLive } from "@effect-bun-starter/auth";
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option, Schema } from "effect";

import { TestApp, TestAppLive, decodeJson, encodeJson } from "./test-app.js";

const SignUpResponse = Schema.Struct({
  user: Schema.Struct({ id: Schema.String }),
});

layer(Layer.merge(TestAppLive, AuthLive))((it) => {
  it.effect("keeps web-origin sessions usable across the API", () =>
    Effect.gen(function* webOriginSession() {
      const app = yield* TestApp;
      const auth = yield* Auth;
      const signUp = yield* app.request(
        new Request("http://localhost:3002/api/auth/sign-up/email", {
          body: encodeJson({
            email: `${globalThis.crypto.randomUUID()}@example.com`,
            name: "Test User",
            password: "AuthSession123!",
          }),
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
          },
          method: "POST",
        })
      );
      assert.strictEqual(signUp.status, 200);

      const body = yield* decodeJson(SignUpResponse, signUp);
      const cookie = Option.fromNullishOr(
        signUp.headers.get("set-cookie")
      ).pipe(
        Option.flatMap((header) =>
          Option.fromUndefinedOr(header.split(";", 1)[0])
        )
      );
      assert(Option.isSome(cookie));

      const userId = yield* auth.userId(new Headers({ cookie: cookie.value }));
      assert.deepStrictEqual(userId, Option.some(body.user.id));
    })
  );
});
