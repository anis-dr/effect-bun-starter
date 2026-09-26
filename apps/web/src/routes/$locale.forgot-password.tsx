import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useAtom } from "@effect/atom-react";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { Effect, Option, Schema } from "effect";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import { useMemo, useRef } from "react";

import {
  focusedMessage,
  focusOnMount,
  SplitScreen,
  touchTarget,
} from "#components/split-screen";
import { emailAttributes, emailField } from "#lib/account-fields";
import { authCall, authClient, authFailureMessage } from "#lib/auth-client";
import {
  afterBlurOrSubmit,
  fieldStatusProps,
  focusFirstInvalid,
  inputAttributes,
  schemaValidator,
} from "#lib/form";
import { siteOrigin } from "#lib/site-path";

import { type Copy, documentTitle, type Locale, messages } from "../i18n";

/** Asks the API to email a reset link (Better Auth answers `{ status: true }`
 * whether or not the address has an account, so the page never reveals
 * which emails exist). The link lands on `redirectTo` with `?token=`, or
 * `?error=INVALID_TOKEN`; the API only accepts its trusted origins there. */
const requestResetAtom = Atom.fn<{
  readonly email: string;
  readonly redirectTo: string;
}>()(
  Effect.fn("Account.requestPasswordReset")(function* ({ email, redirectTo }) {
    yield* authCall(() =>
      authClient.requestPasswordReset({ email, redirectTo })
    );
    return email;
  })
);

const resetRequestForm = (copy: Copy) =>
  Schema.Struct({ email: emailField(copy) });

/** Sent: the address it went to, and the way back. It replaces the form, so
 * its heading takes focus and is read out. */
const LinkSent = ({
  copy,
  email,
  locale,
}: {
  readonly copy: Copy;
  readonly email: string;
  readonly locale: Locale;
}) => (
  <VStack gap={6}>
    <VStack gap={2}>
      <Heading
        level={1}
        ref={focusOnMount}
        tabIndex={-1}
        textWrap="balance"
        xstyle={focusedMessage.target}
      >
        {copy.resetLinkSentTitle}
      </Heading>
      <Text as="p" color="secondary" textWrap="pretty">
        {copy.resetLinkSentDescription}
      </Text>
      <Text as="p" weight="semibold">
        {email}
      </Text>
    </VStack>
    <Button
      href={`/${locale}/sign-in`}
      label={copy.backToSignIn}
      size="lg"
      variant="secondary"
      width="100%"
    />
  </VStack>
);

/** One email field, then a "check your email" state. */
const ForgotPasswordForm = ({
  copy,
  locale,
}: {
  readonly copy: Copy;
  readonly locale: Locale;
}) => {
  const [result, requestReset] = useAtom(requestResetAtom);
  const formElement = useRef(Option.none<HTMLFormElement>());
  const validators = useMemo(
    () => [schemaValidator(resetRequestForm(copy))],
    [copy]
  );
  const form = useForm({
    defaultValues: { email: "" },
    errorVisibility: afterBlurOrSubmit,
    onSubmit: ({ schemaOutputs: [request] }) =>
      requestReset({
        email: request.email,
        redirectTo: `${siteOrigin()}/${locale}/reset-password`,
      }),
    onSubmitInvalid: () => focusFirstInvalid(formElement.current),
    validators,
  });
  const failureView = AsyncResult.builder(result)
    .onFailure((cause) => (
      <Banner
        ref={focusOnMount}
        status="error"
        tabIndex={-1}
        title={authFailureMessage(copy, cause, copy.resetRequestFailed)}
        xstyle={focusedMessage.target}
      />
    ))
    .orNull();

  return AsyncResult.builder(result)
    .onSuccess((email) => (
      <LinkSent copy={copy} email={email} locale={locale} />
    ))
    .orElse(() => (
      <form
        method="post"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        ref={(element) => {
          formElement.current = Option.fromNullishOr(element);
        }}
      >
        <VStack gap={6}>
          <VStack gap={2}>
            <Heading level={1} textWrap="balance">
              {copy.forgotPasswordTitle}
            </Heading>
            <Text as="p" color="secondary" textWrap="pretty">
              {copy.forgotPasswordDescription}
            </Text>
          </VStack>
          {failureView}
          <form.Field name="email">
            {(field) => (
              <TextInput
                htmlName={field.name}
                label={copy.email}
                onBlur={field.handleBlur}
                onChange={(value) => field.handleChange(value)}
                placeholder={copy.emailPlaceholder}
                ref={inputAttributes(emailAttributes("send"))}
                size="lg"
                {...fieldStatusProps(field.errors)}
                type="email"
                value={field.value}
                width="100%"
              />
            )}
          </form.Field>
          <Button
            isLoading={result.waiting}
            label={copy.sendResetLink}
            size="lg"
            type="submit"
            variant="primary"
            width="100%"
          />
          <HStack justify="center">
            <Link
              href={`/${locale}/sign-in`}
              type="supporting"
              xstyle={touchTarget.link}
            >
              {copy.backToSignIn}
            </Link>
          </HStack>
        </VStack>
      </form>
    ));
};

const ForgotPassword = () => {
  const { locale } = Route.useRouteContext();
  return (
    <SplitScreen locale={locale}>
      <ForgotPasswordForm copy={messages[locale]} locale={locale} />
    </SplitScreen>
  );
};

export const Route = createFileRoute("/$locale/forgot-password")({
  component: ForgotPassword,
  head: ({ match }) =>
    documentTitle(match.context.locale, (copy) => copy.forgotPasswordTitle),
  staticData: { isPrivate: true },
});
