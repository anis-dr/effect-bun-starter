import {
  ImageTooLarge,
  maxImageBytes,
  UnsupportedImage,
} from "@effect-bun-starter/domain";
import { Context, Effect, Layer, Option, Schema } from "effect";

/** The codec couldn't read the bytes as an image. */
export class ImageDecodeError extends Schema.TaggedError<ImageDecodeError>()(
  "ImageDecodeError",
  { cause: Schema.Defect() }
) {}

const undecodable = (cause: unknown) => new ImageDecodeError({ cause });

const notAnImage = () =>
  new UnsupportedImage({ message: "Send a JPEG, PNG or WebP image" });

/** Leading bytes of each accepted image type (JPEG, PNG, WebP), as byte
 * runs at offsets. */
const imageSignatures: ReadonlyArray<
  ReadonlyArray<{ readonly bytes: readonly number[]; readonly offset: number }>
> = [
  [{ bytes: [0xff, 0xd8, 0xff], offset: 0 }],
  [{ bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0 }],
  // "RIFF", four size bytes, then "WEBP"
  [
    { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
    { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
  ],
];

/** An uploaded image ready to store: the original re-encoded as WebP at its
 * own size, to save disk, and smaller WebP copies, so pages load what they
 * show instead of the upload. */
export interface ProcessedImage {
  readonly original: Uint8Array;
  /** Ascending by width. */
  readonly copies: ReadonlyArray<{
    readonly bytes: Uint8Array;
    readonly width: number;
  }>;
}

/** The codec underneath: the only part that changes with the library. Each
 * call fails when the bytes don't decode. */
export interface ImageCodec {
  readonly width: (
    bytes: Uint8Array
  ) => Effect.Effect<number, ImageDecodeError>;
  /** WebP at `quality`, scaled down to `width` when given. */
  readonly webp: (
    bytes: Uint8Array,
    options: { readonly quality: number; readonly width: Option.Option<number> }
  ) => Effect.Effect<Uint8Array, ImageDecodeError>;
}

/** Bun's built-in codec (libwebp, lanczos3 resize), so no image library is
 * installed. */
const bunCodec: ImageCodec = {
  webp: (bytes, { quality, width }) =>
    Effect.tryPromise({
      catch: undecodable,
      try: () =>
        Option.match(width, {
          onNone: () => new Bun.Image(bytes),
          onSome: (copyWidth) => new Bun.Image(bytes).resize(copyWidth),
        })
          .webp({ quality })
          .bytes(),
    }),
  width: (bytes) =>
    Effect.tryPromise({
      catch: undecodable,
      try: () => new Bun.Image(bytes).metadata(),
    }).pipe(Effect.map((metadata) => metadata.width)),
};

/** Everything done to an uploaded image: the size limit, the accepted types,
 * decoding, WebP re-encoding and the resized copies. The codec underneath
 * swaps through `ImageProcessor.layer`. */
export class ImageProcessor extends Context.Service<
  ImageProcessor,
  {
    /** Copies at each of `widths` (ascending), never wider than the image. */
    readonly process: (
      bytes: Uint8Array,
      widths: readonly number[]
    ) => Effect.Effect<ProcessedImage, ImageTooLarge | UnsupportedImage>;
  }
>()("@effect-bun-starter/api/ImageProcessor") {
  /** Over any codec; the checks and sizes stay the same. */
  static readonly layer = (codec: ImageCodec) => {
    // Bytes that start like an image but don't decode are not one.
    const decode = <A>(effect: Effect.Effect<A, ImageDecodeError>) =>
      Effect.mapError(effect, notAnImage);
    return Layer.succeed(
      ImageProcessor,
      ImageProcessor.of({
        process: Effect.fn("ImageProcessor.process")(function* (
          bytes: Uint8Array,
          widths: readonly number[]
        ) {
          if (bytes.byteLength > maxImageBytes) {
            return yield* new ImageTooLarge({
              message: "The image is too large",
            });
          }
          yield* Option.fromUndefinedOr(
            imageSignatures.find((runs) =>
              runs.every(({ bytes: run, offset }) =>
                run.every((byte, index) => bytes[offset + index] === byte)
              )
            )
          ).pipe(Effect.fromOption(notAnImage));
          const width = yield* decode(codec.width(bytes));
          const copyWidths = [
            ...new Set(widths.map((copyWidth) => Math.min(copyWidth, width))),
          ];
          const [original, copies] = yield* Effect.all(
            [
              decode(codec.webp(bytes, { quality: 85, width: Option.none() })),
              Effect.forEach(
                copyWidths,
                (copyWidth) =>
                  decode(
                    codec.webp(bytes, {
                      quality: 80,
                      width: Option.some(copyWidth),
                    })
                  ).pipe(
                    Effect.map((copy) => ({ bytes: copy, width: copyWidth }))
                  ),
                { concurrency: 3 }
              ),
            ],
            { concurrency: 2 }
          );
          return { copies, original };
        }),
      })
    );
  };

  /** Over Bun's built-in codec. */
  static readonly layerBun = ImageProcessor.layer(bunCodec);
}
