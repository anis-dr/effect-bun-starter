import { Database, eq, files, sql, user } from "@effect-bun-starter/database";
import {
  AccountUnavailable,
  Api,
  CurrentAccount,
} from "@effect-bun-starter/domain";
import { Effect, FileSystem, Option } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { FileStorage } from "../../file-storage.js";
import {
  removeImageBytes,
  storeImage,
  type StoredImage,
} from "../../uploaded-image.js";

/** Avatar copies: 128 px for lists at 2x, 256 px for a profile at 2x. */
const avatarWidths = [128, 256];

/** Logs a storage or database failure and answers 503. */
const unavailable = Effect.fn("AccountAvatar.unavailable")(function* (
  cause: unknown
) {
  yield* Effect.logError("Avatar dependency failed", cause);
  return yield* new AccountUnavailable({ message: "Account unavailable" });
});

/** The account's row and current avatar file, locked for update: the
 * update that uses it replaces the avatar it read, so two uploads at once
 * each remove the file they actually replaced. */
const lockedAvatar = (db: Database["Service"], userId: string) =>
  db.$with("previous").as(
    db
      .select({
        id: user.id,
        key: files.key,
        variantWidths: files.variantWidths,
      })
      .from(user)
      .leftJoin(files, eq(files.id, user.avatarFileId))
      .where(eq(user.id, userId))
      .for("update", { of: user })
  );

/**
 * Points the account at a new avatar, or at none, in one statement that reads
 * the avatar it replaces under a row lock (`lockedAvatar`). The trigger
 * `user_delete_avatar_file` deletes the replaced file's row; its bytes go
 * here, so callers run it uninterruptibly: the update and the removal of the
 * bytes it replaced happen together or not at all.
 */
const replaceAvatar = Effect.fn("AccountAvatar.replace")(function* (
  next: Option.Option<{
    readonly image: string;
    readonly stored: StoredImage;
  }>
) {
  const db = yield* Database;
  const { userId } = yield* CurrentAccount;
  const previous = lockedAvatar(db, userId);
  const [replaced] = yield* db
    .with(
      ...Option.toArray(Option.map(next, ({ stored }) => stored.file)),
      previous
    )
    .update(user)
    .set(
      Option.match(next, {
        onNone: () => ({ avatarFileId: sql`null`, image: sql`null` }),
        onSome: ({ image, stored: { file } }) => ({
          avatarFileId: sql`(select ${file.id} from ${file})`,
          image,
        }),
      })
    )
    .from(previous)
    .where(eq(user.id, previous.id))
    .returning({
      key: previous.key,
      variantWidths: previous.variantWidths,
    })
    .pipe(Effect.catch(unavailable));
  yield* Option.fromUndefinedOr(replaced).pipe(
    Option.flatMap(({ key, variantWidths }) =>
      Option.all({
        key: Option.fromNullishOr(key),
        variantWidths: Option.fromNullishOr(variantWidths),
      })
    ),
    Option.match({ onNone: () => Effect.void, onSome: removeImageBytes })
  );
});

export const accountAvatarLayer = HttpApiBuilder.group(
  Api,
  "accountAvatar",
  (handlers) =>
    handlers
      .handle("set", ({ payload }) =>
        Effect.gen(function* setAvatar() {
          const storage = yield* FileStorage;
          const fs = yield* FileSystem.FileSystem;
          const bytes = yield* fs
            .readFile(payload.image.path)
            .pipe(Effect.catch(unavailable));
          // Until the update links the new image, `storeImage` removes its
          // bytes on any failure or interruption.
          // ponytail: the URL is written once; rewrite `user.image` if UPLOADS_URL ever moves.
          const image = yield* storeImage(bytes, avatarWidths, (stored) =>
            Effect.succeed(storage.url(stored.largestKey)).pipe(
              Effect.tap((url) =>
                replaceAvatar(Option.some({ image: url, stored }))
              )
            )
          ).pipe(
            Effect.catchTags({
              FileStorageError: unavailable,
              PlatformError: unavailable,
            })
          );
          return { image };
        }).pipe(Effect.withSpan("AccountAvatar.set"))
      )
      .handle("remove", () =>
        replaceAvatar(Option.none()).pipe(
          Effect.uninterruptible,
          Effect.withSpan("AccountAvatar.remove")
        )
      )
);
