import { Database, files } from "@effect-bun-starter/database";
import { Array, Crypto, Effect, Option } from "effect";

import { FileStorage } from "./file-storage.js";
import { ImageProcessor } from "./image-processor.js";

/** Where a resized copy of the WebP at `key` is stored. */
export const variantKey = (key: string, width: number) =>
  key.replace(/\.webp$/u, `-${width}.webp`);

/**
 * Stores an uploaded image as `ImageProcessor` makes it: WebP, with copies at
 * `widths`. `file` is a `with` query inserting its `files` row, for the
 * statement that links it; if that statement fails, `removeStored` removes
 * the bytes again. `largestKey` is the widest copy's key.
 */
export const storeImage = Effect.fn("Image.store")(function* (
  bytes: Uint8Array,
  widths: readonly number[]
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
  const removeStored = Effect.forEach(
    stored,
    (file) => Effect.ignore(storage.remove(file.key)),
    { discard: true }
  );
  yield* Effect.forEach(stored, (file) => storage.put(file.key, file.bytes), {
    concurrency: 4,
    discard: true,
  }).pipe(Effect.tapError(() => removeStored));

  const file = db.$with("file").as(
    db
      .insert(files)
      .values({
        contentType: "image/webp",
        key,
        variantWidths: copies.map((copy) => copy.width),
      })
      .returning({ id: files.id })
  );
  const largestKey = Option.getOrElse(
    Option.map(Array.last(copyFiles), (copy) => copy.key),
    () => key
  );
  return { file, largestKey, removeStored };
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
