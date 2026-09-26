import {
  Database,
  files,
  type WithSubqueryWithSelection,
} from "@effect-bun-starter/database";
import { Array, Crypto, Effect, Option } from "effect";

import { FileStorage } from "./file-storage.js";
import { ImageProcessor } from "./image-processor.js";

/** Where a resized copy of the WebP at `key` is stored. */
export const variantKey = (key: string, width: number) =>
  key.replace(/\.webp$/u, `-${width}.webp`);

/** What `storeImage` hands to the statement that links the image: a `with`
 * query inserting its `files` row, and the widest copy's key. */
export interface StoredImage {
  readonly file: WithSubqueryWithSelection<{ id: typeof files.id }, "file">;
  readonly largestKey: string;
}

/**
 * Stores an uploaded image as `ImageProcessor` makes it (WebP, with copies at
 * `widths`), then runs `link`, the statement that points a row at it.
 *
 * Until `link` succeeds the bytes belong to this upload: a failure or an
 * interruption, while storing or in `link`, removes them. `link` runs
 * uninterruptibly: once its statement is sent it may commit, so it finishes,
 * together with what it does after the commit (removing the bytes it
 * replaced). Interruption waits for it instead of cutting it in half.
 */
export const storeImage = Effect.fn("Image.store")(function* <A, E, R>(
  bytes: Uint8Array,
  widths: readonly number[],
  link: (image: StoredImage) => Effect.Effect<A, E, R>
) {
  const db = yield* Database;
  const storage = yield* FileStorage;
  const imageProcessor = yield* ImageProcessor;
  const { copies, original } = yield* imageProcessor.process(bytes, widths);
  const id = yield* (yield* Crypto.Crypto).randomUUIDv4;
  const key = `${id}.webp`;
  const copyFiles = copies.map((copy) => ({
    bytes: copy.bytes,
    key: variantKey(key, copy.width),
  }));
  const stored = [{ bytes: original, key }, ...copyFiles];
  const largestKey = Option.getOrElse(
    Option.map(Array.last(copyFiles), (copy) => copy.key),
    () => key
  );
  const file: StoredImage["file"] = db.$with("file").as(
    db
      .insert(files)
      .values({
        contentType: "image/webp",
        key,
        variantWidths: copies.map((copy) => copy.width),
      })
      .returning({ id: files.id })
  );

  return yield* Effect.uninterruptibleMask((restore) =>
    restore(
      Effect.forEach(stored, (each) => storage.put(each.key, each.bytes), {
        concurrency: 4,
        discard: true,
      })
    ).pipe(
      Effect.andThen(link({ file, largestKey })),
      Effect.onError(() =>
        Effect.forEach(
          stored,
          (each) => Effect.ignore(storage.remove(each.key)),
          {
            discard: true,
          }
        )
      )
    )
  );
});

/** Removes an image's bytes and copies once no row links them; bytes left
 * behind cost only disk. */
export const removeImageBytes = Effect.fn("Image.removeBytes")(
  function* (image: {
    readonly key: string;
    readonly variantWidths: readonly number[];
  }) {
    const storage = yield* FileStorage;
    yield* Effect.forEach(
      [
        image.key,
        ...image.variantWidths.map((width) => variantKey(image.key, width)),
      ],
      (key) =>
        storage
          .remove(key)
          .pipe(
            Effect.catch((error) =>
              Effect.logWarning("Image file not removed", error)
            )
          ),
      { discard: true }
    );
  }
);
