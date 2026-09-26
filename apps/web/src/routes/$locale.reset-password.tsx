import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useAtom } from "@effect/atom-react";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { Boolean, Effect, Option, Schema } from "effect";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import { useMemo, useRef } from "react";

import { PasswordInput } from "#components/password-input";
import {
  focusedMessage,
  focusOnMount,
  SplitScreen,
  touchTarget,
} from "#components/split-screen";
import { passwordField } from "#lib/account-fields";
import { authCall, authClient } from "#lib/auth-client";
import {
  afterBlurOrSubmit,
  focusFirstInvalid,
  schemaValidator,
} from "#lib/form";

import { type Copy, documentTitle, type Locale, messages } from "../i18n";

const resetPasswordAtom = Atom.fn<{
  readonly newPassword: string;
  readonly token: string;
}>()(
  Effect.fn("Account.resetPassword")(function* ({ newPassword, token }) {
    yield* authCall(() => authClient.resetPassword({ newPassword, token }));
  })
);

const newPasswordForm = (copy: Copy) =>
  Schema.Struct({ password: passwordField(copy) });

type OutcomeLink = { readonly href: string; readonly label: string };

/** A heading, a line under it, and one action: the page's end states. When
 * one replaces the submitted form, its heading takes focus so the change is
 * announced and keyboard focus is not lost. */
const Outcome = ({
  action,
  description,
  replacesForm,
  secondary,
  title,
}: {
  readonly action: OutcomeLink;
  readonly description: string;
  readonly replacesForm: boolean;
  readonly secondary: Option.Option<OutcomeLink>;
  readonly title: string;
}) => (
  <VStack gap={6}>
    <VStack gap={2}>
      <Heading
        level={1}
        textWrap="balance"
        {...Boolean.match(replacesForm, {
          onFalse: () => ({}),
          onTrue: () => ({
            ref: focusOnMount,
            tabIndex: -1,
            xstyle: focusedMessage.target,
          }),
        })}
      >
        {title}
      </Heading>
      <Text as="p" color="secondary" textWrap="pretty">
        {description}
      </Text>
    </VStack>
    <Button
      href={action.href}
      label={action.label}
      size="lg"
      variant="primary"
      width="100%"
    />
    {Option.getOrNull(
      Option.map(secondary, (link) => (
        <HStack justify="center">
          <Link href={link.href} type="supporting" xstyle={touchTarget.link}>
            {link.label}
          </Link>
        </HStack>
      ))
    )}
  </VStack>
);

/** "This link no longer works", with a new link and the way back. */
const InvalidLink = ({
  copy,
  locale,
  replacesForm,
}: {
  readonly copy: Copy;
  readonly locale: Locale;
  readonly replacesForm: boolean;
}) => (
  <Outcome
    action={{ href: `/${locale}/forgot-password`, label: copy.requestNewLink }}
    description={copy.resetLinkInvalidDescription}
    replacesForm={replacesForm}
    secondary={Option.some({
      href: `/${locale}/sign-in`,
      label: copy.backToSignIn,
    })}
    title={copy.resetLinkInvalidTitle}
  />
);

/** A new password: one field with its eye button, no confirmation field (the
 * web.dev guide: show the password instead of asking for it twice). */
const NewPasswordForm = ({
  copy,
  locale,
  token,
}: {
  readonly copy: Copy;
  readonly locale: Locale;
  readonly token: string;
}) => {
  const [result, resetPassword] = useAtom(resetPasswordAtom);
  const formElement = useRef(Option.none<HTMLFormElement>());
  const validators = useMemo(
    () => [schemaValidator(newPasswordForm(copy))],
    [copy]
  );
  const form = useForm({
    defaultValues: { password: "" },
    errorVisibility: afterBlurOrSubmit,
    onSubmit: ({ schemaOutputs: [values] }) =>
      resetPassword({ newPassword: values.password, token }),
    onSubmitInvalid: () => focusFirstInvalid(formElement.current),
    validators,
  });
  // Better Auth's reasons are English; the page says it in its own language.
  const failureView = AsyncResult.builder(result)
    .onFailure(() => (
      <Banner
        ref={focusOnMount}
        status="error"
        tabIndex={-1}
        title={copy.resetPasswordFailed}
        xstyle={focusedMessage.target}
      />
    ))
    .orNull();

  return (
    AsyncResult.builder(result)
      .onSuccess(() => (
        <Outcome
          action={{ href: `/${locale}/sign-in`, label: copy.signInAction }}
          description={copy.passwordResetDoneDescription}
          replacesForm
          secondary={Option.none()}
          title={copy.passwordResetDoneTitle}
        />
      ))
      // A used or expired link cannot succeed on retry: offer a new one.
      .onErrorIf(
        (failure) => Option.contains(failure.code, "INVALID_TOKEN"),
        () => <InvalidLink copy={copy} locale={locale} replacesForm />
      )
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
                {copy.newPasswordTitle}
              </Heading>
              <Text as="p" color="secondary" textWrap="pretty">
                {copy.newPasswordDescription}
              </Text>
            </VStack>
            {failureView}
            <form.Field name="password">
              {(field) => (
                <PasswordInput
                  autoComplete="new-password"
                  description={copy.passwordDescription}
                  errors={field.errors}
                  hideLabel={copy.hidePassword}
                  label={copy.newPassword}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(value) => field.handleChange(value)}
                  placeholder={copy.newPasswordPlaceholder}
                  showLabel={copy.showPassword}
                  value={field.value}
                />
              )}
            </form.Field>
            <Button
              isLoading={result.waiting}
              label={copy.saveNewPassword}
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
      ))
  );
};

const ResetPasswordSearch = Schema.Struct({
  error: Schema.optional(Schema.String),
  token: Schema.optional(Schema.String),
});

/** The link's token, unless Better Auth marked the link bad. */
const linkToken = (search: typeof ResetPasswordSearch.Type) =>
  Option.fromUndefinedOr(search.token).pipe(
    Option.filter(() => Option.isNone(Option.fromUndefinedOr(search.error)))
  );

/** Where the emailed link lands: Better Auth adds `?token=` when the link is
 * good and `?error=INVALID_TOKEN` when it is used or expired. */
const ResetPassword = () => {
  const { locale } = Route.useRouteContext();
  const copy = messages[locale];
  const token = linkToken(Route.useSearch());
  return (
    <SplitScreen locale={locale}>
      {Option.getOrNull(
        Option.map(token, (value) => (
          <NewPasswordForm copy={copy} locale={locale} token={value} />
        ))
      )}
      {Option.getOrNull(
        Option.liftPredicate(
          <InvalidLink copy={copy} locale={locale} replacesForm={false} />,
          () => Option.isNone(token)
        )
      )}
    </SplitScreen>
  );
};

// Each field is read on its own, so a bad one keeps the other.
const decodeText = Schema.decodeUnknownOption(Schema.String);

export const Route = createFileRoute("/$locale/reset-password")({
  component: ResetPassword,
  // A bad link's page is titled for what it says.
  head: ({ match }) =>
    documentTitle(match.context.locale, (copy) =>
      Option.match(linkToken(match.search), {
        onNone: () => copy.resetLinkInvalidTitle,
        onSome: () => copy.newPasswordTitle,
      })
    ),
  staticData: { isPrivate: true },
  validateSearch: (search: {
    readonly error?: unknown;
    readonly token?: unknown;
  }): typeof ResetPasswordSearch.Type => ({
    error: Option.getOrUndefined(decodeText(search.error)),
    token: Option.getOrUndefined(decodeText(search.token)),
  }),
});
