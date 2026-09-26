import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import type { Role } from "@effect-bun-starter/domain";
import { createFileRoute } from "@tanstack/react-router";
import { Effect, Match, Option } from "effect";

import { Admins, CreateStore } from "#components/admin-sections";
import { PendingPage, SiteShell } from "#components/site-shell";
import { signedInOrSignIn } from "#lib/session-state";

import { type Copy, documentTitle, type Locale, messages } from "../i18n";

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
