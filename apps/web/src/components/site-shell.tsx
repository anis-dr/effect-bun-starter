import { AppShell } from "@astryxdesign/core/AppShell";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import type { ReactNode } from "react";

import { type Locale, messages } from "../i18n";
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
