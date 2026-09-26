import { assert, layer } from "@effect/vitest";
import { ConfigProvider, Effect } from "effect";

import { loadAuthConfig } from "../src/auth-config.js";

const configLayer = (env: Record<string, string>) =>
  ConfigProvider.layer(
    ConfigProvider.fromUnknown({
      BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-chars-long",
      BETTER_AUTH_URL: "http://localhost:3000",
      ...env,
    })
  );

layer(configLayer({}))("valid auth config", (it) => {
  it.effect("loads Better Auth env config", () =>
    Effect.gen(function* loadAuthEnvConfigTest() {
      const config = yield* loadAuthConfig;
      assert.deepStrictEqual(config, {
        baseURL: "http://localhost:3000/",
        crossSubDomainCookies: { enabled: false },
        secret: "test-secret-that-is-at-least-32-chars-long",
        trustedOrigins: ["http://localhost:3000"],
      });
    })
  );
});

layer(
  configLayer({
    BETTER_AUTH_COOKIE_DOMAIN: "example.com",
    BETTER_AUTH_TRUSTED_ORIGIN: "https://app.example.com",
    BETTER_AUTH_URL: "https://api.example.com",
  })
)("sibling subdomains", (it) => {
  it.effect("shares the session cookie on the parent domain", () =>
    Effect.gen(function* shareCookieOnParentDomainTest() {
      const config = yield* loadAuthConfig;
      assert.deepStrictEqual(config.crossSubDomainCookies, {
        domain: "example.com",
        enabled: true,
      });
    })
  );
});

layer(
  configLayer({
    BETTER_AUTH_COOKIE_DOMAIN: "example.com",
    BETTER_AUTH_TRUSTED_ORIGIN: "https://app.example.org",
    BETTER_AUTH_URL: "https://api.example.com",
  })
)("cookie domain outside the web host", (it) => {
  it.effect("rejects a cookie domain the web app cannot read", () =>
    Effect.gen(function* rejectForeignCookieDomainTest() {
      const error = yield* Effect.flip(loadAuthConfig);
      assert.strictEqual(
        error.message,
        "BETTER_AUTH_COOKIE_DOMAIN example.com must be app.example.org or a parent of it"
      );
    })
  );
});

layer(configLayer({ BETTER_AUTH_SECRET: "short" }))(
  "invalid auth config",
  (it) => {
    it.effect("rejects short secrets", () =>
      Effect.gen(function* rejectShortSecretsTest() {
        const error = yield* Effect.flip(loadAuthConfig);
        assert.strictEqual(
          error.message,
          "BETTER_AUTH_SECRET must be at least 32 characters"
        );
      })
    );
  }
);
