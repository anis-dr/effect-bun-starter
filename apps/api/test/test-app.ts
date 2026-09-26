import { Database } from "@effect-bun-starter/database";
import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import { Context, Effect, Layer, Schema } from "effect";
import { HttpRouter } from "effect/unstable/http";

import { appLayer } from "../src/api.js";

class TestAppOpenError extends Schema.TaggedError<TestAppOpenError>()(
  "TestAppOpenError",
  { cause: Schema.Defect() }
) {}

const testAppLayer = appLayer.pipe(
  Layer.provideMerge(Database.layer),
  Layer.provide(BunHttpServer.layerHttpServices)
);

const acquireApp = Effect.try({
  catch: (cause) => new TestAppOpenError({ cause }),
  try: () => HttpRouter.toWebHandler(testAppLayer, { disableLogger: true }),
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

export class TestApp extends Context.Service<
  TestApp,
  {
    readonly request: (request: Request) => Effect.Effect<Response>;
  }
>()("@effect-bun-starter/api/TestApp") {
  /** The whole API over the test database, disposed with the layer. */
  static readonly layer = Layer.effect(TestApp, makeTestApp);
}

export const encodeJson = Schema.encodeSync(
  Schema.fromJsonString(Schema.Unknown)
);

export const decodeJson = Effect.fn("TestApp.decodeJson")(function* <A, I, R>(
  schema: Schema.Codec<A, I, R>,
  response: Response
) {
  const body = yield* Effect.promise(() => response.json());
  return yield* Schema.decodeUnknownEffect(schema)(body);
});
