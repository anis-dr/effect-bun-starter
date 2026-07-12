import { describe, expect, it } from "@effect/vitest";
import { ConfigProvider, Effect } from "effect";

import { loadAuthConfig } from "../src/auth-config.js";

const withConfig = <A, E, R>(effect: Effect.Effect<A, E, R>, secret: string) =>
  effect.pipe(
    Effect.provide(
      ConfigProvider.layer(
        ConfigProvider.fromUnknown({
          BETTER_AUTH_SECRET: secret,
          BETTER_AUTH_URL: "http://localhost:3000",
        })
      )
    )
  );

describe("auth config", () => {
  it.effect("loads Better Auth env config", () =>
    withConfig(
      Effect.gen(function* loadAuthEnvConfigTest() {
        const config = yield* loadAuthConfig;
        expect(config).toEqual({
          baseURL: "http://localhost:3000/",
          secret: "test-secret-that-is-at-least-32-chars-long",
        });
      }),
      "test-secret-that-is-at-least-32-chars-long"
    )
  );

  it.effect("rejects short secrets", () =>
    withConfig(
      Effect.gen(function* rejectShortSecretsTest() {
        const exit = yield* loadAuthConfig.pipe(Effect.exit);
        expect(exit._tag).toBe("Failure");
      }),
      "short"
    )
  );
});
