import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { List, ListItem } from "@astryxdesign/core/List";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import type { AdminResponse, Role } from "@effect-bun-starter/domain";
import { useAtom, useAtomSet, useAtomValue } from "@effect/atom-react";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { Cause, Effect, Exit, Match, Option, Schema } from "effect";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import { type ReactNode, useMemo, useRef } from "react";

import { PendingPage, SiteShell } from "#components/site-shell";
import { focusedMessage, focusOnMount } from "#components/split-screen";
import { emailField } from "#lib/account-fields";
import { ApiClient } from "#lib/api-client";
import {
  afterBlurOrSubmit,
  fieldStatusProps,
  focusFirstInvalid,
  inputAttributes,
  schemaValidator,
} from "#lib/form";
import { signedInOrSignIn } from "#lib/session-state";

import { type Copy, documentTitle, fill, type Locale, messages } from "../i18n";

type Admin = typeof AdminResponse.Type;

/** A banner that reports an action's outcome and takes focus when it
 * appears, so keyboard and screen-reader users land on it. */
interface Notice {
  readonly status: "error" | "success";
  readonly title: string;
}

const NoticeBanner = ({ notice }: { readonly notice: Notice }) => (
  <Banner
    ref={focusOnMount}
    status={notice.status}
    tabIndex={-1}
    title={notice.title}
    xstyle={focusedMessage.target}
  />
);

/** A submitted form: waits for the call, then moves focus to the field the
 * API refused, if any. */
const submitThen = <A,>(
  submit: () => Promise<A>,
  form: Option.Option<HTMLFormElement>
) =>
  void Effect.promise(submit).pipe(
    Effect.map(() => focusFirstInvalid(form)),
    Effect.runPromise
  );

const createStoreAtom = ApiClient.mutation("adminStores", "create");
const storeNoticeAtom = Atom.make(Option.none<Notice>());

const storeForm = (copy: Copy) =>
  Schema.Struct({
    name: Schema.Trim.check(
      Schema.isNonEmpty({ message: copy.storeNameRequired }),
      Schema.isMaxLength(80, { message: copy.storeNameTooLong })
    ),
  });

/** Create a store. A taken name is the name field's error; another failure
 * or the new store is a banner that takes focus. */
const CreateStore = ({ copy }: { readonly copy: Copy }) => {
  const create = useAtomSet(createStoreAtom, { mode: "promiseExit" });
  const [notice, setNotice] = useAtom(storeNoticeAtom);
  const formElement = useRef(Option.none<HTMLFormElement>());
  const validators = useMemo(() => [schemaValidator(storeForm(copy))], [copy]);
  const form = useForm({
    defaultValues: { name: "" },
    errorVisibility: afterBlurOrSubmit,
    onSubmit: ({ createValidationError, formApi, schemaOutputs: [store] }) =>
      Effect.runPromise(
        Effect.promise(() => create({ payload: store })).pipe(
          Effect.map((exit) =>
            Exit.match(exit, {
              onFailure: (cause) =>
                Option.match(
                  Option.filter(
                    Cause.findErrorOption(cause),
                    (failure) => failure._tag === "StoreNameTaken"
                  ),
                  {
                    onNone: () => {
                      setNotice(
                        Option.some({
                          status: "error",
                          title: copy.storeCreateFailed,
                        })
                      );
                      return Option.none();
                    },
                    onSome: () =>
                      Option.some(
                        createValidationError({
                          fields: { name: copy.storeNameTaken },
                        })
                      ),
                  }
                ),
              onSuccess: (created) => {
                formApi.reset();
                setNotice(
                  Option.some({
                    status: "success",
                    title: fill(copy.storeCreated, { name: created.name }),
                  })
                );
                return Option.none();
              },
            })
          ),
          Effect.map(Option.getOrUndefined)
        )
      ),
    onSubmitInvalid: () => focusFirstInvalid(formElement.current),
    validators,
  });

  return (
    <VStack gap={4}>
      <Heading level={2}>{copy.createStore}</Heading>
      {Option.getOrNull(
        Option.map(notice, (shown) => (
          <NoticeBanner key={shown.title} notice={shown} />
        ))
      )}
      <form
        method="post"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setNotice(Option.none());
          submitThen(() => form.handleSubmit(), formElement.current);
        }}
        ref={(element) => {
          formElement.current = Option.fromNullishOr(element);
        }}
      >
        <VStack align="start" gap={4}>
          <form.Field name="name">
            {(field) => (
              <TextInput
                htmlName={field.name}
                label={copy.storeName}
                onBlur={field.handleBlur}
                onChange={(value) => field.handleChange(value)}
                placeholder={copy.searchPlaceholder}
                ref={inputAttributes({
                  autocomplete: "off",
                  dir: "auto",
                  enterkeyhint: "send",
                  required: "",
                })}
                {...fieldStatusProps(field.errors)}
                value={field.value}
                width="100%"
              />
            )}
          </form.Field>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                isLoading={isSubmitting}
                label={copy.createStoreAction}
                type="submit"
                variant="primary"
              />
            )}
          </form.Subscribe>
        </VStack>
      </form>
    </VStack>
  );
};

const adminsAtom = ApiClient.query("adminAdmins", "list", {
  reactivityKeys: ["admins"],
});
const appointAtom = ApiClient.mutation("adminAdmins", "appoint");
const removeAdminAtom = ApiClient.mutation("adminAdmins", "remove");
const adminsNoticeAtom = Atom.make(Option.none<Notice>());
// The admin the removal confirmation is about. It outlives the dialog's
// closing, so the dialog keeps its text while it animates out.
const removingAtom = Atom.make(Option.none<Admin>());
const isConfirmingAtom = Atom.make(false);

const appointForm = (copy: Copy) => Schema.Struct({ email: emailField(copy) });

/** Appoint an admin by email. An email with no account is the field's
 * error; the appointed admin is a banner that takes focus. */
const AppointAdmin = ({ copy }: { readonly copy: Copy }) => {
  const appoint = useAtomSet(appointAtom, { mode: "promiseExit" });
  const setNotice = useAtomSet(adminsNoticeAtom);
  const formElement = useRef(Option.none<HTMLFormElement>());
  const validators = useMemo(
    () => [schemaValidator(appointForm(copy))],
    [copy]
  );
  const form = useForm({
    defaultValues: { email: "" },
    errorVisibility: afterBlurOrSubmit,
    onSubmit: ({ createValidationError, formApi, schemaOutputs: [request] }) =>
      Effect.runPromise(
        Effect.promise(() =>
          appoint({ payload: request, reactivityKeys: ["admins"] })
        ).pipe(
          Effect.map((exit) =>
            Exit.match(exit, {
              onFailure: (cause) =>
                Option.match(
                  Option.filter(
                    Cause.findErrorOption(cause),
                    (failure) => failure._tag === "AccountNotFound"
                  ),
                  {
                    onNone: () => {
                      setNotice(
                        Option.some({
                          status: "error",
                          title: copy.appointFailed,
                        })
                      );
                      return Option.none();
                    },
                    onSome: () =>
                      Option.some(
                        createValidationError({
                          fields: { email: copy.appointNotFound },
                        })
                      ),
                  }
                ),
              onSuccess: (admin) => {
                formApi.reset();
                setNotice(
                  Option.some({
                    status: "success",
                    title: fill(copy.appointed, { name: admin.name }),
                  })
                );
                return Option.none();
              },
            })
          ),
          Effect.map(Option.getOrUndefined)
        )
      ),
    onSubmitInvalid: () => focusFirstInvalid(formElement.current),
    validators,
  });

  return (
    <form
      method="post"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setNotice(Option.none());
        submitThen(() => form.handleSubmit(), formElement.current);
      }}
      ref={(element) => {
        formElement.current = Option.fromNullishOr(element);
      }}
    >
      <VStack align="start" gap={4}>
        <form.Field name="email">
          {(field) => (
            <TextInput
              description={copy.appointEmailHint}
              htmlName={field.name}
              label={copy.appointEmail}
              onBlur={field.handleBlur}
              onChange={(value) => field.handleChange(value)}
              placeholder={copy.emailPlaceholder}
              // Someone else's address: typed left to right, never
              // autofilled with the admin's own or corrected.
              ref={inputAttributes({
                autocapitalize: "none",
                autocomplete: "off",
                dir: "ltr",
                enterkeyhint: "send",
                required: "",
                spellcheck: "false",
              })}
              type="email"
              {...fieldStatusProps(field.errors)}
              value={field.value}
              width="100%"
            />
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              isLoading={isSubmitting}
              label={copy.appointAction}
              type="submit"
              variant="primary"
            />
          )}
        </form.Subscribe>
      </VStack>
    </form>
  );
};

/** Confirms a removal. On success it closes, and the notice banner takes
 * focus from the row's button, which leaves with the row. */
const RemoveAdminDialog = ({ copy }: { readonly copy: Copy }) => {
  const removing = useAtomValue(removingAtom);
  const [isOpen, setIsOpen] = useAtom(isConfirmingAtom);
  const [result, remove] = useAtom(removeAdminAtom, { mode: "promiseExit" });
  const setNotice = useAtomSet(adminsNoticeAtom);
  const name = Option.match(removing, {
    onNone: () => "",
    onSome: (admin) => admin.name,
  });
  const confirm = (admin: Admin) =>
    void Effect.promise(() =>
      remove({ params: { userId: admin.userId }, reactivityKeys: ["admins"] })
    ).pipe(
      Effect.map((exit) => {
        setIsOpen(false);
        setNotice(
          Option.some(
            Exit.match(exit, {
              onFailure: (): Notice => ({
                status: "error",
                title: copy.removeFailed,
              }),
              onSuccess: (): Notice => ({
                status: "success",
                title: fill(copy.removed, { name: admin.name }),
              }),
            })
          )
        );
      }),
      Effect.runPromise
    );

  return (
    <AlertDialog
      actionLabel={copy.removeAdminAction}
      cancelLabel={copy.cancel}
      description={copy.removeAdminDescription}
      isActionLoading={result.waiting}
      isOpen={isOpen}
      onAction={() => Option.map(removing, confirm)}
      onOpenChange={setIsOpen}
      title={fill(copy.removeAdminTitle, { name })}
    />
  );
};

const AdminRow = ({
  admin,
  copy,
}: {
  readonly admin: Admin;
  readonly copy: Copy;
}) => {
  const setRemoving = useAtomSet(removingAtom);
  const setConfirming = useAtomSet(isConfirmingAtom);
  const setNotice = useAtomSet(adminsNoticeAtom);
  return (
    <ListItem
      description={admin.email}
      endContent={
        <Button
          label={fill(copy.removeAdminLabel, { name: admin.name })}
          onClick={() => {
            setNotice(Option.none());
            setRemoving(Option.some(admin));
            setConfirming(true);
          }}
          size="sm"
          variant="secondary"
        >
          {copy.removeAdmin}
        </Button>
      }
      label={admin.name}
    />
  );
};

const AdminList = ({
  admins,
  copy,
}: {
  readonly admins: ReadonlyArray<Admin>;
  readonly copy: Copy;
}) =>
  Option.match(
    Option.liftPredicate(admins, (rows) => rows.length > 0),
    {
      onNone: () => (
        <Text as="p" color="secondary">
          {copy.adminsEmpty}
        </Text>
      ),
      onSome: (rows) => (
        <List hasDividers>
          {rows.map((admin) => (
            <AdminRow admin={admin} copy={copy} key={admin.userId} />
          ))}
        </List>
      ),
    }
  );

/** The superadmin's section: the appointed admins, appoint by email, remove
 * with confirmation. */
const Admins = ({ copy }: { readonly copy: Copy }) => {
  const admins = useAtomValue(adminsAtom);
  const notice = useAtomValue(adminsNoticeAtom);
  const list: ReactNode = AsyncResult.builder(admins)
    .onInitial(() => <Spinner />)
    .onFailure(() => <Banner status="error" title={copy.adminsUnavailable} />)
    .onSuccess((appointed) => <AdminList admins={appointed} copy={copy} />)
    .render();

  return (
    <VStack gap={4}>
      <VStack gap={2}>
        <Heading level={2}>{copy.admins}</Heading>
        <Text as="p" color="secondary" textWrap="pretty">
          {copy.adminsLead}
        </Text>
      </VStack>
      {Option.getOrNull(
        Option.map(notice, (shown) => (
          <NoticeBanner key={shown.title} notice={shown} />
        ))
      )}
      <AppointAdmin copy={copy} />
      {list}
      <RemoveAdminDialog copy={copy} />
    </VStack>
  );
};

/** Signed in without an admin role: the refusal, with a way home. */
const AccessDenied = ({
  copy,
  locale,
}: {
  readonly copy: Copy;
  readonly locale: Locale;
}) => (
  <EmptyState
    actions={
      <Button href={`/${locale}`} label={copy.backHome} variant="primary" />
    }
    description={copy.accessDeniedDescription}
    headingLevel={1}
    title={copy.accessDenied}
  />
);

const AdminPage = () => {
  const { locale } = Route.useRouteContext();
  const { role } = Route.useLoaderData();
  const copy = messages[locale];
  return (
    <SiteShell locale={locale}>
      {Match.value(role).pipe(
        Match.when("member", () => (
          <AccessDenied copy={copy} locale={locale} />
        )),
        Match.orElse((staff) => (
          <VStack gap={10} maxWidth="40rem">
            <VStack gap={2}>
              <Heading level={1}>{copy.admin}</Heading>
              <Text as="p" color="secondary" textWrap="pretty">
                {copy.adminLead}
              </Text>
            </VStack>
            <CreateStore copy={copy} />
            {Option.getOrNull(
              Option.liftPredicate(
                <Admins copy={copy} />,
                () => staff === "superadmin"
              )
            )}
          </VStack>
        ))
      )}
    </SiteShell>
  );
};

/** The admin area: rendered in the browser (ADR 0016). The role comes from
 * `GET /admin/session`, read with the session; signed-out visitors go to
 * sign-in first and members get the refusal. The API checks every action
 * again. */
export const Route = createFileRoute("/$locale/admin")({
  component: AdminPage,
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
  head: ({ loaderData, match }) =>
    documentTitle(match.context.locale, (copy) =>
      Match.value(
        Option.getOrElse(
          Option.map(Option.fromUndefinedOr(loaderData), (data) => data.role),
          (): Role => "admin"
        )
      ).pipe(
        Match.when("member", () => copy.accessDenied),
        Match.orElse(() => copy.admin)
      )
    ),
  pendingComponent: PendingPage,
  ssr: false,
  staticData: { isPrivate: true },
});
