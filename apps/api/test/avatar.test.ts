import {
  Database,
  eq,
  files,
  inArray,
  user,
} from "@effect-bun-starter/database";
import { maxImageBytes } from "@effect-bun-starter/domain";
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option, Schema } from "effect";

import { TestApp, decodeJson, signUp } from "./test-app.js";

const AvatarResponse = Schema.Struct({ image: Schema.String });
const ErrorResponse = Schema.Struct({ _tag: Schema.String });

// A 200 × 200 PNG: narrower than the 256 px copy, so copies stop at 200.
const pngBytes = Uint8Array.fromBase64(
  "iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAIAAAAiOjnJAAABeElEQVR42u3SMQ0AAAgEsReGMIQhEBMMDE2q4HKpHjgXCTAWxsJYYCyMhbHAWBgLY4GxMBbGAmNhLIwFxsJYGAuMhbEwFhgLY2EsMBbGwlhgLIyFscBYGAtjgbEwFsYCY2EsjAXGwlgYC4yFsTAWGAtjYSwwFsbCWGAsjIWxwFgYC2OBsTAWxgJjYSyMBcbCWBgLjIWxMBYYC2NhLDAWxsJYYCyMhbHAWBgLY4GxMBbGAmNhLIyFsVTAWBgLY4GxMBbGAmNhLIwFxsJYGAuMhbEwFhgLY2EsMBbGwlhgLIyFscBYGAtjgbEwFsYCY2EsjAXGwlgYC4yFsTAWGAtjYSwwFsbCWGAsjIWxwFgYC2OBsTAWxgJjYSyMBcbCWBgLjIWxMBYYC2NhLDAWxsJYYCyMhbHAWBgLY4GxMBbGAmNhLIwFxsJYGAtjqYCxMBbGAmNhLIwFxsJYGAuMhbEwFhgLY2EsMBbGwlhgLIyFscBYGAtjgbH4ZgEwIsbWNHjppQAAAABJRU5ErkJggg=="
);

const avatarUrl = "http://localhost:3002/account/avatar";

/** `PUT /account/avatar` with `bytes` as the form's `image` file. */
const upload = (cookie: string, bytes: Uint8Array<ArrayBuffer> = pngBytes) => {
  const form = new FormData();
  form.append("image", new File([bytes], "avatar.png", { type: "image/png" }));
  return new Request(avatarUrl, {
    body: form,
    headers: { cookie },
    method: "PUT",
  });
};

const refusal = Effect.fn("AvatarTest.refusal")(function* (response: Response) {
  const { _tag } = yield* decodeJson(ErrorResponse, response);
  return [response.status, _tag];
});

const accountImage = Effect.fn("AvatarTest.accountImage")(function* (
  userId: string
) {
  const db = yield* Database;
  const [account] = yield* db
    .select({ image: user.image, key: files.key })
    .from(user)
    .leftJoin(files, eq(files.id, user.avatarFileId))
    .where(eq(user.id, userId));
  assert.isDefined(account);
  return {
    image: Option.fromNullishOr(account.image),
    key: Option.fromNullishOr(account.key),
  };
});

layer(Layer.merge(TestApp.layer, Database.layer))((it) => {
  it.effect("refuses a signed-out upload with 401", () =>
    Effect.gen(function* () {
      const app = yield* TestApp;
      assert.deepStrictEqual(yield* refusal(yield* app.request(upload(""))), [
        401,
        "Unauthorized",
      ]);
    })
  );

  it.effect(
    "sets, replaces and removes the account's avatar with its files",
    () =>
      Effect.gen(function* () {
        const app = yield* TestApp;
        const db = yield* Database;
        const email = `avatar-${globalThis.crypto.randomUUID().slice(0, 8)}@example.com`;
        yield* Effect.addFinalizer(() =>
          Effect.orDie(db.delete(user).where(inArray(user.email, [email])))
        );
        const { cookie, userId } = yield* signUp(email);
        const status = (url: string) =>
          Effect.map(
            app.request(new Request(url)),
            (response) => response.status
          );

        assert.deepStrictEqual(
          yield* refusal(
            yield* app.request(
              upload(cookie, new TextEncoder().encode("hello"))
            )
          ),
          [422, "UnsupportedImage"]
        );
        // Starts like a PNG but doesn't decode.
        assert.deepStrictEqual(
          yield* refusal(
            yield* app.request(upload(cookie, pngBytes.slice(0, 40)))
          ),
          [422, "UnsupportedImage"]
        );
        const tooLarge = new Uint8Array(maxImageBytes + 1);
        tooLarge.set(pngBytes);
        assert.deepStrictEqual(
          yield* refusal(yield* app.request(upload(cookie, tooLarge))),
          [413, "ImageTooLarge"]
        );

        const first = yield* app.request(upload(cookie));
        assert.strictEqual(first.status, 200);
        const { image: firstImage } = yield* decodeJson(AvatarResponse, first);
        assert.match(
          firstImage,
          /^http:\/\/localhost:3002\/uploads\/[0-9a-f-]{36}-200\.webp$/u
        );
        const served = yield* app.request(new Request(firstImage));
        const servedBytes = yield* Effect.promise(() => served.bytes());
        assert.deepStrictEqual(
          yield* Effect.promise(() => new Bun.Image(servedBytes).metadata()),
          { format: "webp", height: 200, width: 200 }
        );
        const firstAccount = yield* accountImage(userId);
        assert.deepStrictEqual(firstAccount.image, Option.some(firstImage));
        assert(Option.isSome(firstAccount.key));
        const firstKey = firstAccount.key.value;

        const second = yield* app.request(upload(cookie));
        const { image: secondImage } = yield* decodeJson(
          AvatarResponse,
          second
        );
        assert.notStrictEqual(secondImage, firstImage);
        assert.strictEqual(yield* status(secondImage), 200);
        // The replaced avatar's bytes and file row are gone.
        assert.strictEqual(yield* status(firstImage), 404);
        assert.strictEqual(
          (yield* db
            .select({ id: files.id })
            .from(files)
            .where(eq(files.key, firstKey))).length,
          0
        );

        const removed = yield* app.request(
          new Request(avatarUrl, { headers: { cookie }, method: "DELETE" })
        );
        assert.strictEqual(removed.status, 204);
        assert.strictEqual(yield* status(secondImage), 404);
        assert.deepStrictEqual(yield* accountImage(userId), {
          image: Option.none(),
          key: Option.none(),
        });
      })
  );
});
