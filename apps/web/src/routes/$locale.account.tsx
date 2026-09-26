import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import type { InputStatus } from "@astryxdesign/core/Field";
import { FileInput } from "@astryxdesign/core/FileInput";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { ImageTooLarge, maxImageBytes } from "@effect-bun-starter/domain";
import { useAtom, useAtomSubscribe } from "@effect/atom-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Cause, Effect, Match, Option } from "effect";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import { useRef } from "react";

import { PendingPage, SiteShell } from "#components/site-shell";
import { ApiClient } from "#lib/api-client";
import {
  authCall,
  authClient,
  authFailureMessage,
  signOutAtom,
} from "#lib/auth-client";
import { signedInOrSignIn } from "#lib/session-state";
import { siteOrigin } from "#lib/site-path";

import { type Copy, documentTitle, fill, type Locale, messages } from "../i18n";

/** Mails the account a new confirmation link, landing in `locale`. */
const resendVerificationAtom = Atom.fn(
  Effect.fn("Account.resendVerification")(function* (input: {
    readonly email: string;
    readonly locale: Locale;
  }) {
    yield* authCall(() =>
      authClient.sendVerificationEmail({
        callbackURL: `${siteOrigin()}/${input.locale}?verified=1`,
        email: input.email,
      })
    );
  })
);

/** An unconfirmed email: what it holds back, and a new link. */
const EmailVerification = ({
  copy,
  email,
  locale,
}: {
  readonly copy: Copy;
  readonly email: string;
  readonly locale: Locale;
}) => {
  const [result, resend] = useAtom(resendVerificationAtom);
  return (
    <VStack gap={3}>
      {AsyncResult.builder(result)
        .onSuccess(() => (
          <Banner
            status="success"
            title={fill(copy.verificationSent, { email })}
          />
        ))
        .orElse(() => (
          <Banner
            description={fill(copy.emailUnverifiedDescription, { email })}
            endContent={
              <Button
                isLoading={result.waiting}
                label={copy.requestNewLink}
                onClick={() => resend({ email, locale })}
                variant="secondary"
              />
            }
            status="info"
            title={copy.emailUnverified}
          />
        ))}
      {AsyncResult.builder(result)
        .onFailure((cause) => (
          <Banner
            status="error"
            title={authFailureMessage(copy, cause, copy.verificationSendFailed)}
          />
        ))
        .orNull()}
    </VStack>
  );
};

/** Uploads `file` as the account's avatar. A file over the API's limit is
 * refused here with the API's own error, without sending it. */
const uploadAvatarAtom = ApiClient.runtime.fn(
  Effect.fn("Account.uploadAvatar")(function* (file: File) {
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

const Account = () => {
  const { locale } = Route.useRouteContext();
  const { user } = Route.useLoaderData();
  const copy = messages[locale];
  const router = useRouter();
  const [uploadResult, upload] = useAtom(uploadAvatarAtom);
  const [removeResult, remove] = useAtom(removeAvatarAtom);
  const [signOutResult, signOut] = useAtom(signOutAtom);
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
    <SiteShell locale={locale}>
      <VStack gap={8} maxWidth="40rem">
        <VStack gap={2}>
          <Heading level={1}>{copy.account}</Heading>
          <Text as="p" color="secondary" dir="auto">
            {user.email}
          </Text>
        </VStack>
        {Option.getOrNull(
          Option.liftPredicate(
            <EmailVerification
              copy={copy}
              email={user.email}
              locale={locale}
            />,
            () => !user.emailVerified
          )
        )}
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
                  onChange={(files) => {
                    Option.map(
                      Option.liftPredicate(
                        files,
                        (file) => file instanceof File
                      ),
                      (file) => {
                        remove(Atom.Reset);
                        upload(file);
                      }
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
        <VStack align="start" gap={4}>
          <Heading level={2}>{copy.signOut}</Heading>
          <Text as="p" color="secondary">
            {copy.signOutDescription}
          </Text>
          <Button
            isLoading={signOutResult.waiting}
            label={copy.signOut}
            onClick={() => signOut()}
            variant="secondary"
          />
          {AsyncResult.builder(signOutResult)
            .onFailure((cause) => (
              <Banner
                status="error"
                title={authFailureMessage(
                  copy,
                  cause,
                  copy.authenticationFailed
                )}
              />
            ))
            .orNull()}
        </VStack>
      </VStack>
    </SiteShell>
  );
};

/** One account's own page: rendered in the browser (ADR 0016), signed-out
 * visitors go to sign-in first. */
export const Route = createFileRoute("/$locale/account")({
  component: Account,
  loader: ({ context, location, parentMatchPromise }) =>
    Effect.runPromise(
      Effect.promise(() => parentMatchPromise).pipe(
        Effect.map((parent) =>
          signedInOrSignIn(
            Option.fromUndefinedOr(parent.loaderData),
            context.locale,
            location.href
          )
        )
      )
    ),
  head: ({ match }) =>
    documentTitle(match.context.locale, (copy) => copy.account),
  pendingComponent: PendingPage,
  ssr: false,
  staticData: { isPrivate: true },
});
