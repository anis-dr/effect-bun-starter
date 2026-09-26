import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useAtom, useAtomSubscribe } from "@effect/atom-react";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Effect, Match, Option, Schema } from "effect";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import { useMemo, useRef } from "react";

import { PasswordInput } from "#components/password-input";
import {
  focusedMessage,
  focusOnMount,
  SplitScreen,
  touchTarget,
} from "#components/split-screen";
import {
  emailAttributes,
  emailField,
  passwordField,
} from "#lib/account-fields";
import { authCall, authClient, authFailureMessage } from "#lib/auth-client";
import {
  afterBlurOrSubmit,
  fieldStatusProps,
  focusFirstInvalid,
  inputAttributes,
  schemaValidator,
} from "#lib/form";
import { getSession, type Session } from "#lib/session-state";
import { encodedSitePath, SitePath } from "#lib/site-path";

import { type Copy, documentTitle, type Locale, messages } from "../i18n";

type AuthenticationMode = "signIn" | "signUp";

interface AuthenticationInput {
  readonly email: string;
  readonly mode: AuthenticationMode;
  readonly name: string;
  readonly password: string;
}

const authenticateAtom = Atom.fn<AuthenticationInput>()(
  Effect.fn("Account.authenticate")(function* (input) {
    yield* Match.value(input.mode).pipe(
      Match.when("signUp", () =>
        authCall(() =>
          authClient.signUp.email({
            email: input.email,
            name: input.name,
            password: input.password,
          })
        )
      ),
      Match.orElse(() =>
        authCall(() =>
          authClient.signIn.email({
            email: input.email,
            password: input.password,
          })
        )
      )
    );
  })
);

/** Copy for each authentication mode and the mode its switch leads to. */
const authenticationModes = (copy: Copy) =>
  ({
    signIn: {
      action: copy.signInAction,
      description: copy.signInDescription,
      password: "current-password",
      // Signing in only needs the password; its rules are for new ones.
      passwordHint: {},
      passwordPlaceholder: copy.currentPasswordPlaceholder,
      search: { mode: "signUp" },
      switchLabel: copy.createAccount,
      switchPrompt: copy.noAccount,
      title: copy.signIn,
    },
    signUp: {
      action: copy.createAccountAction,
      description: copy.createAccountDescription,
      password: "new-password",
      passwordHint: { description: copy.passwordDescription },
      passwordPlaceholder: copy.newPasswordPlaceholder,
      search: {},
      switchLabel: copy.signIn,
      switchPrompt: copy.haveAccount,
      title: copy.createAccount,
    },
  }) satisfies Record<
    AuthenticationMode,
    {
      readonly action: string;
      readonly description: string;
      readonly password: "current-password" | "new-password";
      readonly passwordHint: { readonly description?: string };
      readonly passwordPlaceholder: string;
      /** The search that opens the other mode. */
      readonly search: { readonly mode?: "signUp" };
      readonly switchLabel: string;
      readonly switchPrompt: string;
      readonly title: string;
    }
  >;

/** The sign-in or sign-up form as an Effect Schema, in the interface's
 * language. It trims the email and name it decodes. Signing in asks only for
 * a password; a new one needs the API's 8-character minimum. */
const accountForm = (copy: Copy, mode: AuthenticationMode) =>
  Match.value(mode).pipe(
    Match.when("signUp", () =>
      Schema.Struct({
        email: emailField(copy),
        name: Schema.Trim.check(
          Schema.isNonEmpty({ message: copy.accountNameRequired })
        ),
        password: passwordField(copy),
      })
    ),
    Match.orElse(() =>
      Schema.Struct({
        email: emailField(copy),
        name: Schema.String,
        password: Schema.String.check(
          Schema.isNonEmpty({ message: copy.currentPasswordRequired })
        ),
      })
    )
  );

/** `redirect` must stay on this site (see `SitePath`); `mode=signUp` opens
 * account creation. Each is read on its own, so a bad one keeps the other. */
const SignInSearch = Schema.Struct({
  mode: Schema.optional(Schema.Literal("signUp")),
  redirect: Schema.optional(SitePath),
});
const decodeMode = Schema.decodeUnknownOption(SignInSearch.fields.mode);
const decodeRedirect = Schema.decodeUnknownOption(SignInSearch.fields.redirect);

/** Where a signed-in account goes from here: `redirect`, else home. */
const afterSignIn = (
  locale: Locale,
  next: (typeof SignInSearch.Type)["redirect"]
) =>
  Option.match(Option.fromUndefinedOr(next), {
    onNone: () => `/${locale}`,
    onSome: encodedSitePath,
  });

/** Already signed in: go on to `href` instead. */
const leaveWhenSignedIn = (href: string) => (session: Session) =>
  Match.value(session).pipe(
    Match.when({ signedIn: true }, () => redirect({ href, throw: true })),
    Match.orElse(() => session)
  );

const emptyAccount = { email: "", name: "", password: "" };

/** Sign-in and sign-up. The mode lives in the URL (`?mode=signUp`), so it
 * survives a reload and can be linked to. */
const Authentication = ({
  copy,
  locale,
  mode,
}: {
  readonly copy: Copy;
  readonly locale: Locale;
  readonly mode: AuthenticationMode;
}) => {
  const [authenticationResult, authenticate] = useAtom(authenticateAtom);
  const formElement = useRef(Option.none<HTMLFormElement>());
  const router = useRouter();
  const navigate = Route.useNavigate();
  const { redirect: next } = Route.useSearch();
  // Signed in: read the header's account again, then go on. The page
  // navigates itself: a redirect from its loader during the reload would cut
  // the account read short, and the header would stay signed out.
  useAtomSubscribe(authenticateAtom, (result) => {
    if (AsyncResult.isSuccess(result)) {
      void Effect.runPromise(
        Effect.promise(() =>
          // `sync`: wait for the new account, not revalidate in the
          // background while the next page shows the old one.
          router.invalidate({
            filter: (match) => match.routeId === "/$locale",
            sync: true,
          })
        ).pipe(
          Effect.andThen(() =>
            Effect.promise(() =>
              router.navigate({
                href: afterSignIn(locale, next),
                replace: true,
              })
            )
          )
        )
      );
    }
  });
  const validators = useMemo(
    () => [schemaValidator(accountForm(copy, mode))],
    [copy, mode]
  );
  const form = useForm({
    defaultValues: emptyAccount,
    errorVisibility: afterBlurOrSubmit,
    onSubmit: ({ schemaOutputs: [account] }) =>
      authenticate({ ...account, mode }),
    onSubmitInvalid: () => focusFirstInvalid(formElement.current),
    validators,
  });
  const modeCopy = authenticationModes(copy)[mode];
  const failureView = AsyncResult.builder(authenticationResult)
    .onFailure((cause) => (
      <Banner
        ref={focusOnMount}
        status="error"
        tabIndex={-1}
        title={authFailureMessage(copy, cause, copy.authenticationFailed)}
        xstyle={focusedMessage.target}
      />
    ))
    .orNull();

  return (
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
            {modeCopy.title}
          </Heading>
          <Text as="p" color="secondary" textWrap="pretty">
            {modeCopy.description}
          </Text>
        </VStack>
        {failureView}
        <FormLayout>
          {Option.getOrNull(
            Option.liftPredicate(
              <form.Field name="name">
                {(field) => (
                  <TextInput
                    htmlName={field.name}
                    label={copy.accountName}
                    onBlur={field.handleBlur}
                    onChange={(value) => field.handleChange(value)}
                    placeholder={copy.accountNamePlaceholder}
                    ref={inputAttributes({
                      autocomplete: "name",
                      enterkeyhint: "next",
                      required: "",
                    })}
                    size="lg"
                    {...fieldStatusProps(field.errors)}
                    value={field.value}
                    width="100%"
                  />
                )}
              </form.Field>,
              () => mode === "signUp"
            )
          )}
          <form.Field name="email">
            {(field) => (
              <TextInput
                htmlName={field.name}
                label={copy.email}
                onBlur={field.handleBlur}
                onChange={(value) => field.handleChange(value)}
                placeholder={copy.emailPlaceholder}
                ref={inputAttributes(emailAttributes("next"))}
                size="lg"
                {...fieldStatusProps(field.errors)}
                type="email"
                value={field.value}
                width="100%"
              />
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <PasswordInput
                autoComplete={modeCopy.password}
                {...modeCopy.passwordHint}
                errors={field.errors}
                hideLabel={copy.hidePassword}
                label={copy.password}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(value) => field.handleChange(value)}
                placeholder={modeCopy.passwordPlaceholder}
                showLabel={copy.showPassword}
                value={field.value}
              />
            )}
          </form.Field>
          {Option.getOrNull(
            Option.liftPredicate(
              <HStack justify="end">
                <Link
                  href={`/${locale}/forgot-password`}
                  type="supporting"
                  xstyle={touchTarget.link}
                >
                  {copy.forgotPassword}
                </Link>
              </HStack>,
              () => mode === "signIn"
            )
          )}
        </FormLayout>
        <Button
          isLoading={authenticationResult.waiting}
          label={modeCopy.action}
          size="lg"
          type="submit"
          variant="primary"
          width="100%"
        />
        <HStack align="center" gap={1} justify="center" wrap="wrap">
          <Text color="secondary" type="supporting">
            {modeCopy.switchPrompt}
          </Text>
          <Button
            label={modeCopy.switchLabel}
            // A fresh start in the other mode: keep what was typed, drop
            // errors and the last attempt's message.
            onClick={() => {
              authenticate(Atom.Reset);
              form.reset(form.state.values);
              void navigate({
                search: ({ redirect }) => ({ redirect, ...modeCopy.search }),
              });
            }}
            variant="ghost"
          />
        </HStack>
      </VStack>
    </form>
  );
};

const SignIn = () => {
  const { locale } = Route.useRouteContext();
  const { mode } = Route.useSearch();
  return (
    <SplitScreen locale={locale}>
      <Authentication
        copy={messages[locale]}
        locale={locale}
        mode={Option.getOrElse(
          Option.fromUndefinedOr(mode),
          (): AuthenticationMode => "signIn"
        )}
      />
    </SplitScreen>
  );
};

/** A visitor who is already signed in is sent on at once; one who signs in
 * here is sent on by the form. */
export const Route = createFileRoute("/$locale/sign-in")({
  component: SignIn,
  loaderDeps: ({ search }) => ({ redirect: search.redirect }),
  // Only on arrival: the form's own reload after signing in must not
  // redirect under it.
  shouldReload: ({ cause }) => cause === "enter",
  loader: ({ context, deps }) =>
    Effect.runPromise(
      Effect.promise(() => getSession()).pipe(
        Effect.map(
          leaveWhenSignedIn(afterSignIn(context.locale, deps.redirect))
        )
      )
    ),
  head: ({ match }) =>
    documentTitle(
      match.context.locale,
      (copy) =>
        authenticationModes(copy)[
          Option.getOrElse(
            Option.fromUndefinedOr(match.search.mode),
            (): AuthenticationMode => "signIn"
          )
        ].title
    ),
  staticData: { isPrivate: true },
  validateSearch: (search: {
    readonly mode?: unknown;
    readonly redirect?: unknown;
  }): typeof SignInSearch.Type => ({
    mode: Option.getOrUndefined(decodeMode(search.mode)),
    redirect: Option.getOrUndefined(decodeRedirect(search.redirect)),
  }),
});
