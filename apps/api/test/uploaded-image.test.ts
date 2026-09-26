import { Database } from "@effect-bun-starter/database";
import { BunServices } from "@effect/platform-bun";
import { assert, layer } from "@effect/vitest";
import { Deferred, Effect, Fiber, Layer } from "effect";

import { FileStorage } from "../src/file-storage.js";
import { ImageProcessor } from "../src/image-processor.js";
import { storeImage } from "../src/uploaded-image.js";
import { pngBytes } from "./test-app.js";

/** Storage in a map; writing a key ending in `hangOn` stores its bytes,
 * opens `hanging` and then waits for a signal that never comes, like a disk
 * write cut off by the request ending. */
const memoryStorage = Effect.fn("UploadedImageTest.memoryStorage")(function* (
  hangOn: string
) {
  const stored = new Map<string, Uint8Array>();
  const hanging = yield* Deferred.make<void>();
  const neverWritten = yield* Deferred.make<void>();
  const storage = FileStorage.of({
    put: Effect.fn("MemoryStorage.put")(function* (key, bytes) {
      stored.set(key, bytes);
      if (key.endsWith(hangOn)) {
        yield* Deferred.complete(hanging, Effect.void);
        return yield* Deferred.await(neverWritten);
      }
    }),
    remove: (key) =>
      Effect.sync(() => {
        stored.delete(key);
      }),
    url: (key) => key,
  });
  return { hanging, storage, stored };
});

layer(
  Layer.mergeAll(Database.layer, ImageProcessor.layerBun, BunServices.layer)
)((it) => {
  it.effect("removes every stored file when storing is interrupted", () =>
    Effect.gen(function* () {
      const { hanging, storage, stored } = yield* memoryStorage("-200.webp");
      const upload = yield* storeImage(
        pngBytes,
        [128, 256],
        () => Effect.void
      ).pipe(Effect.provideService(FileStorage, storage), Effect.forkChild);
      yield* Deferred.await(hanging);
      yield* Fiber.interrupt(upload);
      assert.deepStrictEqual([...stored.keys()], []);
    })
  );

  it.effect("removes every stored file when the link fails", () =>
    Effect.gen(function* () {
      const { storage, stored } = yield* memoryStorage("no key");
      const error = yield* storeImage(pngBytes, [128, 256], () =>
        Effect.fail("link refused")
      ).pipe(Effect.provideService(FileStorage, storage), Effect.flip);
      assert.strictEqual(error, "link refused");
      assert.deepStrictEqual([...stored.keys()], []);
    })
  );

  it.effect(
    "finishes a started link when interrupted and keeps its files",
    () =>
      Effect.gen(function* () {
        const { storage, stored } = yield* memoryStorage("no key");
        const linking = yield* Deferred.make<void>();
        const release = yield* Deferred.make<void>();
        const upload = yield* storeImage(
          pngBytes,
          [128, 256],
          ({ largestKey }) =>
            Deferred.complete(linking, Effect.void).pipe(
              Effect.andThen(Deferred.await(release)),
              Effect.map(() => largestKey)
            )
        ).pipe(Effect.provideService(FileStorage, storage), Effect.forkChild);
        yield* Deferred.await(linking);
        const interrupting = yield* Effect.forkChild(Fiber.interrupt(upload));
        yield* Deferred.complete(release, Effect.void);
        yield* Fiber.join(interrupting);
        assert.match(yield* Fiber.join(upload), /^[0-9a-f-]{36}-200\.webp$/u);
        assert.deepStrictEqual(
          [...stored.keys()]
            .map((key) => key.replace(/^[0-9a-f-]{36}/u, "<id>"))
            .sort(),
          ["<id>-128.webp", "<id>-200.webp", "<id>.webp"]
        );
      })
  );
});
