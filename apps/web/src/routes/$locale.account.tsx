import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useAtom } from "@effect/atom-react";
import { createFileRoute } from "@tanstack/react-router";
import { Effect, Option } from "effect";
import { AsyncResult, Atom } from "effect/unstable/reactivity";

import { AvatarPicker } from "#components/avatar-picker";
import { PendingPage, SiteShell } from "#components/site-shell";
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

const Account = () => {
  const { locale } = Route.useRouteContext();
  const { user } = Route.useLoaderData();
  const copy = messages[locale];
  const [signOutResult, signOut] = useAtom(signOutAtom);

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
        <AvatarPicker copy={copy} user={user} />
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
