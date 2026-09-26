import { Database } from "@effect-bun-starter/database";
import { Mailer, type RenderedEmail } from "@effect-bun-starter/email";
import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import { assert } from "@effect/vitest";
import {
  ConfigProvider,
  Context,
  Effect,
  FileSystem,
  Layer,
  Option,
  Schedule,
  Schema,
} from "effect";
import { HttpRouter } from "effect/unstable/http";

import { appLayer } from "../src/api.js";
import { FileStorage } from "../src/file-storage.js";
import { ImageProcessor } from "../src/image-processor.js";

class TestAppOpenError extends Schema.TaggedError<TestAppOpenError>()(
  "TestAppOpenError",
  { cause: Schema.Defect() }
) {}

// A 200 × 200 PNG: narrower than the 256 px copy, so copies stop at 200.
export const pngBytes = Uint8Array.fromBase64(
  "iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAIAAAAiOjnJAAABeElEQVR42u3SMQ0AAAgEsReGMIQhEBMMDE2q4HKpHjgXCTAWxsJYYCyMhbHAWBgLY4GxMBbGAmNhLIwFxsJYGAuMhbEwFhgLY2EsMBbGwlhgLIyFscBYGAtjgbEwFsYCY2EsjAXGwlgYC4yFsTAWGAtjYSwwFsbCWGAsjIWxwFgYC2OBsTAWxgJjYSyMBcbCWBgLjIWxMBYYC2NhLDAWxsJYYCyMhbHAWBgLY4GxMBbGAmNhLIyFsVTAWBgLY4GxMBbGAmNhLIwFxsJYGAuMhbEwFhgLY2EsMBbGwlhgLIyFscBYGAtjgbEwFsYCY2EsjAXGwlgYC4yFsTAWGAtjYSwwFsbCWGAsjIWxwFgYC2OBsTAWxgJjYSyMBcbCWBgLjIWxMBYYC2NhLDAWxsJYYCyMhbHAWBgLY4GxMBbGAmNhLIwFxsJYGAtjqYCxMBbGAmNhLIwFxsJYGAuMhbEwFhgLY2EsMBbGwlhgLIyFscBYGAtjgbH4ZgEwIsbWNHjppQAAAABJRU5ErkJggg=="
);

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

/** Stored files in a temporary directory, served at `/uploads` like the
 * real app, removed with the app. */
const fileStorageTestLayer = Layer.unwrap(
  FileSystem.FileSystem.use((fs) => fs.makeTempDirectoryScoped()).pipe(
    Effect.map((directory) =>
      Layer.provideMerge(
        FileStorage.layerUploadsRoute(directory),
        FileStorage.layerFileSystem({
          directory,
          publicUrl: "http://localhost:3002/uploads",
        })
      )
    )
  )
);

const testAppLayer = appLayer.pipe(
  Layer.provideMerge(fileStorageTestLayer),
  Layer.provideMerge(ImageProcessor.layerBun),
  Layer.provideMerge(Database.layer),
  Layer.provide(recordingMailerLayer),
  Layer.provideMerge(BunHttpServer.layerHttpServices),
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
 * its session cookie. Mail recorded for an earlier account with this email
 * is dropped, so `mailTo` sees only this account's. */
export const signUp = Effect.fn("TestApp.signUp")(function* (email: string) {
  const app = yield* TestApp;
  const kept = sentMail.filter((mail) => mail.to !== email);
  sentMail.splice(0, sentMail.length, ...kept);
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

/** The mails sent to `to` whose subject is `subject`; waits until at least
 * one arrived, since Better Auth sends them in the background (tests that
 * wait need the real clock: `excludeTestServices`). */
export const mailTo = Effect.fn("TestApp.mailTo")(function* (
  to: string,
  subject: string
) {
  return yield* Effect.suspend(() =>
    Effect.succeed(
      sentMail.filter(
        (mail) => mail.to === to && mail.email.subject === subject
      )
    )
  ).pipe(
    Effect.filterOrFail((mails) => mails.length > 0),
    Effect.retry({ schedule: Schedule.spaced("20 millis"), times: 100 })
  );
});

/** Opens the verification link mailed to `email` at sign-up, as its owner
 * does from the inbox. */
export const verifyEmail = Effect.fn("TestApp.verifyEmail")(function* (
  email: string
) {
  const app = yield* TestApp;
  const [mail] = yield* mailTo(email, "Confirm your email");
  assert.isDefined(mail);
  const link = Option.fromNullishOr(
    /http:\/\/localhost:3002\/api\/auth\/verify-email\?[^\s\]]+/u.exec(
      mail.email.text
    )
  );
  assert(Option.isSome(link));
  const response = yield* app.request(new Request(link.value[0]));
  assert.strictEqual(response.status, 302);
});
