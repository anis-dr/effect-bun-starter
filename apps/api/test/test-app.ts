import { DatabaseLive } from "@effect-bun-starter/database";
import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import { Context, Effect, Layer, Schema } from "effect";
import { HttpRouter } from "effect/unstable/http";

import { AppLive } from "../src/api.js";

class TestAppOpenError extends Schema.TaggedErrorClass<TestAppOpenError>()(
  "TestAppOpenError",
  { cause: Schema.Defect() }
) {}

export class TestApp extends Context.Service<
  TestApp,
  {
    readonly request: (request: Request) => Effect.Effect<Response>;
  }
>()("@effect-bun-starter/api-test/TestApp") {}

const appLayer = AppLive.pipe(
  Layer.provideMerge(DatabaseLive),
  Layer.provide(BunHttpServer.layerHttpServices)
);

const acquireApp = Effect.try({
  catch: (cause) => new TestAppOpenError({ cause }),
  try: () => HttpRouter.toWebHandler(appLayer, { disableLogger: true }),
}).pipe(Effect.orDie);

const makeTestApp = Effect.acquireRelease(acquireApp, ({ dispose }) =>
  Effect.promise(dispose)
).pipe(
  Effect.map((app) => ({
    request: Effect.fn("TestApp.request")((request: Request) =>
      Effect.promise(() => app.handler(request))
    ),
  }))
);

export const TestAppLive = Layer.effect(TestApp, makeTestApp);

export const encodeJson = Schema.encodeSync(Schema.UnknownFromJsonString);

export const decodeJson = Effect.fn("TestApp.decodeJson")(function* <A, I, R>(
  schema: Schema.Codec<A, I, R>,
  response: Response
) {
  const body = yield* Effect.promise(() => response.json());
  return yield* Schema.decodeUnknownEffect(schema)(body);
});
