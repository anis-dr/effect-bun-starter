import { HealthResponse } from "@effect-bun-starter/domain";
import { assert, layer } from "@effect/vitest";
import { Effect } from "effect";

import { TestApp, TestAppLive, decodeJson } from "./test-app.js";

layer(TestAppLive)((it) => {
  it.effect("serves the health response contract", () =>
    Effect.gen(function* healthResponseContractTest() {
      const app = yield* TestApp;
      const response = yield* app.request(
        new Request("http://localhost:3002/health")
      );
      const health = yield* decodeJson(HealthResponse, response);

      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(health, {
        service: "effect-bun-starter-api",
        status: "ok",
      });
    })
  );
});
