import { Database } from "@effect-bun-starter/database";
import { Mailer, type RenderedEmail } from "@effect-bun-starter/email";
import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import { assert } from "@effect/vitest";
import { ConfigProvider, Context, Effect, Layer, Option, Schema } from "effect";
import { HttpRouter } from "effect/unstable/http";

import { appLayer } from "../src/api.js";

class TestAppOpenError extends Schema.TaggedError<TestAppOpenError>()(
  "TestAppOpenError",
  { cause: Schema.Defect() }
) {}

/** The account the test app treats as superadmin (`SUPERADMIN_EMAIL`). */
export const testSuperadminEmail = "superadmin@test.example.com";

/** Every email the test app sent, oldest first. */
export const sentMail: Array<{
  readonly email: RenderedEmail;
  readonly to: string;
}> = [];

const recordingMailerLayer = Layer.succeed(
  Mailer,
  Mailer.of({
    send: (to, email) =>
      Effect.sync(() => {
        sentMail.push({ email, to });
      }),
  })
);

const testAppLayer = appLayer.pipe(
  Layer.provideMerge(Database.layer),
  Layer.provide(recordingMailerLayer),
  Layer.provide(BunHttpServer.layerHttpServices),
  Layer.provide(
    ConfigProvider.layerAdd(
      ConfigProvider.fromUnknown({ SUPERADMIN_EMAIL: testSuperadminEmail }),
      { asPrimary: true }
    )
  )
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

const SignUpResponse = Schema.Struct({
  user: Schema.Struct({ id: Schema.String }),
});

/** Creates an account through Better Auth, as the web app does, and returns
 * its session cookie. */
export const signUp = Effect.fn("TestApp.signUp")(function* (email: string) {
  const app = yield* TestApp;
  const response = yield* app.request(
    new Request("http://localhost:3002/api/auth/sign-up/email", {
      body: encodeJson({ email, name: "Test Account", password: "Test123!pw" }),
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      method: "POST",
    })
  );
  assert.strictEqual(response.status, 200);
  const body = yield* decodeJson(SignUpResponse, response);
  const cookie = Option.fromNullishOr(response.headers.get("set-cookie")).pipe(
    Option.flatMap((header) => Option.fromUndefinedOr(header.split(";", 1)[0]))
  );
  assert(Option.isSome(cookie));
  return { cookie: cookie.value, email, userId: body.user.id };
});
