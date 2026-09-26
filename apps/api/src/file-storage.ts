import {
  Config,
  Context,
  Effect,
  FileSystem,
  Layer,
  Path,
  Schema,
} from "effect";
import { HttpStaticServer } from "effect/unstable/http";

export class FileStorageError extends Schema.TaggedError<FileStorageError>()(
  "FileStorageError",
  { cause: Schema.Defect() }
) {}

interface FileSystemOptions {
  readonly directory: string;
  readonly publicUrl: string;
}

const storageConfig = Config.all({
  directory: Config.String("UPLOADS_DIR").pipe(Config.withDefault("uploads")),
  publicUrl: Config.URL("UPLOADS_URL").pipe(
    Config.withDefault(new URL("http://localhost:3002/uploads")),
    Config.map((url) => url.href.replace(/\/$/u, ""))
  ),
});

/** Where stored files live: images, videos, documents. The `files` table keeps
 * a key; the adapter owns the bytes and the public URL. */
export class FileStorage extends Context.Service<
  FileStorage,
  {
    readonly put: (
      key: string,
      bytes: Uint8Array
    ) => Effect.Effect<void, FileStorageError>;
    readonly remove: (key: string) => Effect.Effect<void, FileStorageError>;
    readonly url: (key: string) => string;
  }
>()("@effect-bun-starter/api/FileStorage") {
  // ponytail: local disk served by this API; an S3-compatible layer replaces
  // both layers below behind the same service.
  /** Files on local disk under `directory`, public at `publicUrl`. */
  static readonly layerFileSystem = (options: FileSystemOptions) =>
    Layer.effect(
      FileStorage,
      Effect.gen(function* makeFileSystemStorage() {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        yield* fs.makeDirectory(options.directory, { recursive: true });

        return FileStorage.of({
          put: (key, bytes) =>
            fs
              .writeFile(path.join(options.directory, key), bytes)
              .pipe(
                Effect.mapError((cause) => new FileStorageError({ cause }))
              ),
          remove: (key) =>
            fs
              .remove(path.join(options.directory, key), { force: true })
              .pipe(
                Effect.mapError((cause) => new FileStorageError({ cause }))
              ),
          url: (key) => `${options.publicUrl}/${key}`,
        });
      })
    );

  /** Files on local disk as `UPLOADS_DIR` and `UPLOADS_URL` say; provided
   * beside the database, since handlers ask for it per request. */
  static readonly layerConfig = Layer.unwrap(
    Effect.gen(function* fileStorageConfig() {
      return FileStorage.layerFileSystem(yield* storageConfig);
    })
  );

  /** `GET /uploads/<key>` from `directory`. Keys are fresh ids, so a URL
   * never changes content and caches for a year. */
  static readonly layerUploadsRoute = (directory: string) =>
    HttpStaticServer.layer({
      cacheControl: "public, max-age=31536000, immutable",
      prefix: "/uploads",
      root: directory,
    });
}

/** The route, provided on the router with the other routes. */
export const uploadsRouteLayer = Layer.unwrap(
  Effect.gen(function* uploadsRouteLayer() {
    return FileStorage.layerUploadsRoute((yield* storageConfig).directory);
  })
);
