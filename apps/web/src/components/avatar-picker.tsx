import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import type { InputStatus } from "@astryxdesign/core/Field";
import { FileInput } from "@astryxdesign/core/FileInput";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { StackItem } from "@astryxdesign/core/Stack";
import { VStack } from "@astryxdesign/core/VStack";
import { ImageTooLarge, maxImageBytes } from "@effect-bun-starter/domain";
import { useAtom, useAtomSubscribe } from "@effect/atom-react";
import { useRouter } from "@tanstack/react-router";
import { Cause, Effect, Match, Option } from "effect";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import { useRef } from "react";

import { ApiClient } from "#lib/api-client";
import type { SignedIn } from "#lib/session-state";

import type { Copy } from "../i18n";

/** Uploads `file` as the account's avatar. A file over the API's limit is
 * refused here with the API's own error, without sending it. */
const uploadAvatarAtom = ApiClient.runtime.fn(
  Effect.fn("AvatarPicker.upload")(function* (file: File) {
    if (file.size > maxImageBytes) {
      return yield* new ImageTooLarge({ message: "Image too large" });
    }
    const client = yield* ApiClient;
    const payload = new FormData();
    payload.append("image", file);
    return yield* client.accountAvatar.set({ payload });
  })
);
const removeAvatarAtom = ApiClient.mutation("accountAvatar", "remove");

/** Why the photo wasn't saved, in the page's language. */
const uploadFailure = (
  copy: Copy,
  cause: Cause.Cause<{ readonly _tag: string }>
) =>
  Option.match(Cause.findErrorOption(cause), {
    onNone: () => copy.avatarFailed,
    onSome: (failure) =>
      Match.value(failure).pipe(
        Match.tag("ImageTooLarge", () => copy.imageTooLarge),
        Match.tag("UnsupportedImage", () => copy.imageUnsupported),
        Match.orElse(() => copy.avatarFailed)
      ),
  });

/** A finished upload or removal as the photo picker's status. */
const outcome = <E,>(
  result: AsyncResult.AsyncResult<unknown, E>,
  saved: string,
  failed: (cause: Cause.Cause<E>) => string
): Option.Option<InputStatus> =>
  Match.value(result).pipe(
    Match.when({ waiting: true }, () => Option.none()),
    Match.tag("Success", () =>
      Option.some<InputStatus>({ message: saved, type: "success" })
    ),
    Match.tag("Failure", (failure) =>
      Option.some<InputStatus>({
        message: failed(failure.cause),
        type: "error",
      })
    ),
    Match.orElse(() => Option.none())
  );

/** The account's photo: upload a new one or remove it. Either reads the
 * account again, so the header shows the change too. */
export const AvatarPicker = ({
  copy,
  user,
}: {
  readonly copy: Copy;
  readonly user: SignedIn["user"];
}) => {
  const router = useRouter();
  const [uploadResult, upload] = useAtom(uploadAvatarAtom);
  const [removeResult, remove] = useAtom(removeAvatarAtom);
  const fileInput = useRef(Option.none<HTMLInputElement>());
  const image = Option.fromNullishOr(user.image);
  // Each action resets the other, so at most one has an outcome to show.
  const pickerStatus = Option.match(
    Option.orElse(
      outcome(uploadResult, copy.avatarSaved, (cause) =>
        uploadFailure(copy, cause)
      ),
      () =>
        outcome(removeResult, copy.avatarRemoved, () => copy.avatarRemoveFailed)
    ),
    { onNone: () => ({}), onSome: (status) => ({ status }) }
  );
  // The remove button leaves with the photo: focus the photo picker, whose
  // trigger button sits beside the native file input.
  const focusPicker = () =>
    Option.map(
      Option.flatMap(fileInput.current, (input) =>
        Option.fromNullishOr(input.parentElement?.querySelector("button"))
      ),
      (trigger) => trigger.focus()
    );

  // The header and this page read the account again, with the new avatar.
  useAtomSubscribe(uploadAvatarAtom, (result) => {
    if (AsyncResult.isSuccess(result)) {
      void router.invalidate();
    }
  });
  useAtomSubscribe(removeAvatarAtom, (result) => {
    if (AsyncResult.isSuccess(result)) {
      void Effect.gen(function* () {
        yield* Effect.promise(() => router.invalidate({ sync: true }));
        focusPicker();
      }).pipe(Effect.runPromise);
    }
  });

  return (
    <VStack gap={4}>
      <Heading level={2}>{copy.avatarHeading}</Heading>
      <HStack align="center" gap={6} wrap="wrap">
        <Avatar
          name={user.name}
          size="xl"
          {...Option.match(image, {
            onNone: () => ({}),
            onSome: (src) => ({ src }),
          })}
          tooltip={false}
        />
        <StackItem size="fill">
          <VStack align="start" gap={3}>
            <FileInput
              accept="image/jpeg,image/png,image/webp"
              description={copy.avatarHint}
              isLoading={uploadResult.waiting}
              label={copy.avatarUpload}
              // Every selection clears the last outcome, so a file the
              // picker refuses (`null`) shows the picker's own error.
              onChange={(files) => {
                upload(Atom.Reset);
                remove(Atom.Reset);
                Option.map(
                  Option.liftPredicate(files, (file) => file instanceof File),
                  upload
                );
              }}
              ref={(input) => {
                fileInput.current = Option.fromNullishOr(input);
              }}
              {...pickerStatus}
              // Never holds a file: the avatar beside it shows the saved
              // photo.
              value={Option.getOrNull(Option.none<File>())}
              width="100%"
            />
            {Option.getOrNull(
              Option.map(image, () => (
                <Button
                  isLoading={removeResult.waiting}
                  label={copy.avatarRemove}
                  onClick={() => {
                    upload(Atom.Reset);
                    remove({});
                  }}
                  variant="secondary"
                />
              ))
            )}
          </VStack>
        </StackItem>
      </HStack>
    </VStack>
  );
};
