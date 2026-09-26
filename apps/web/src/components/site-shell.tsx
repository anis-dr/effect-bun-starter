import { AppShell } from "@astryxdesign/core/AppShell";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
import { Spinner } from "@astryxdesign/core/Spinner";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import { useRouteContext } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { type Locale, messages } from "../i18n";
import { AccountMenu } from "./account-menu";
import { LanguageMenu } from "./language-menu";
import { ThemeToggle } from "./theme-toggle";

/** Every page's frame: the header (app name home link, then the page-wide
 * controls) above the page content. */
export const SiteShell = ({
  children,
  locale,
}: {
  readonly children: ReactNode;
  readonly locale: Locale;
}) => {
  const copy = messages[locale];
  return (
    <AppShell
      contentPadding={6}
      height="auto"
      mobileNav={false}
      topNav={
        <TopNav
          endContent={
            <HStack align="center" gap={1}>
              <AccountMenu locale={locale} />
              <LanguageMenu locale={locale} />
              <ThemeToggle locale={locale} />
            </HStack>
          }
          heading={
            <TopNavHeading heading={copy.appName} headingHref={`/${locale}`} />
          }
          label={copy.navigation}
        />
      }
    >
      {children}
    </AppShell>
  );
};

/** A missing page, inside the frame, with a way home. */
export const NotFoundPage = ({ locale }: { readonly locale: Locale }) => {
  const copy = messages[locale];
  return (
    <SiteShell locale={locale}>
      <EmptyState
        actions={
          <Button href={`/${locale}`} label={copy.backHome} variant="primary" />
        }
        description={copy.notFoundBody}
        headingLevel={1}
        title={copy.notFoundTitle}
      />
    </SiteShell>
  );
};

/** A browser-rendered page (`ssr: false`) until it loads: on the server and
 * during a slow client navigation, the frame with a spinner. */
export const PendingPage = () => {
  const locale = useRouteContext({
    from: "/$locale",
    select: (context) => context.locale,
  });
  return (
    <SiteShell locale={locale}>
      <Spinner size="lg" />
    </SiteShell>
  );
};
