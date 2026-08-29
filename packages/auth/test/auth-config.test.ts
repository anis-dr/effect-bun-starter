import { assert, layer } from "@effect/vitest";
import { ConfigProvider, Effect } from "effect";

import { loadAuthConfig } from "../src/auth-config.js";

const configLayer = (secret: string) =>
  ConfigProvider.layer(
    ConfigProvider.fromUnknown({
      BETTER_AUTH_SECRET: secret,
      BETTER_AUTH_URL: "http://localhost:3000",
    })
  );

layer(configLayer("test-secret-that-is-at-least-32-chars-long"))(
  "valid auth config",
  (it) => {
    it.effect("loads Better Auth env config", () =>
      Effect.gen(function* loadAuthEnvConfigTest() {
        const config = yield* loadAuthConfig;
        assert.deepStrictEqual(config, {
          baseURL: "http://localhost:3000/",
          secret: "test-secret-that-is-at-least-32-chars-long",
        });
      })
    );
  }
);

layer(configLayer("short"))("invalid auth config", (it) => {
  it.effect("rejects short secrets", () =>
    Effect.gen(function* rejectShortSecretsTest() {
      const exit = yield* loadAuthConfig.pipe(Effect.exit);
      assert.strictEqual(exit._tag, "Failure");
    })
  );
});
