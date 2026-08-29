import { HealthResponse, SystemGroup } from "@effect-bun-starter/domain";
import * as BunHttpPlatform from "@effect/platform-bun/BunHttpPlatform";
import * as BunServices from "@effect/platform-bun/BunServices";
import { assert, it } from "@effect/vitest";
import { Context, Effect, Layer, Schema } from "effect";
import { Etag, HttpRouter } from "effect/unstable/http";
import { HttpApi, HttpApiBuilder } from "effect/unstable/httpapi";

import { HealthLive } from "../src/public/system/health-live.js";

class SystemApiOpenError extends Schema.TaggedErrorClass<SystemApiOpenError>()(
  "SystemApiOpenError",
  { cause: Schema.Defect() }
) {}

const PlatformLive = Layer.mergeAll(
  BunHttpPlatform.layer,
  BunServices.layer,
  Etag.layer
);
const SystemApiLive = HttpApiBuilder.layer(
  HttpApi.make("Api").add(SystemGroup)
).pipe(Layer.provide(HealthLive), Layer.provide(PlatformLive));
const acquireApp = Effect.try({
  catch: (cause) => new SystemApiOpenError({ cause }),
  try: () => HttpRouter.toWebHandler(SystemApiLive),
});

it.effect("serves the health response contract", () =>
  Effect.acquireRelease(acquireApp, ({ dispose }) =>
    Effect.promise(dispose)
  ).pipe(
    Effect.flatMap(({ handler }) =>
      Effect.gen(function* healthResponseContractTest() {
        const response = yield* Effect.promise(() =>
          handler(new Request("http://localhost/health"), Context.empty())
        );
        const body = yield* Effect.promise(() => response.json());
        const health = yield* Schema.decodeUnknownEffect(HealthResponse)(body);

        assert.strictEqual(response.status, 200);
        assert.deepStrictEqual(health, {
          service: "effect-bun-starter-api",
          status: "ok",
        });
      })
    )
  )
);
