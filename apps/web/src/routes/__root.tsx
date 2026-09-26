import {
  getLocaleDirection,
  InternationalizationProvider,
} from "@astryxdesign/core/i18n";
import { LinkProvider } from "@astryxdesign/core/Link";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { TanStackDevtools } from "@tanstack/react-devtools";
import {
  HeadContent,
  Scripts,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Array as Arr, Boolean, Option } from "effect";
import type { ReactNode } from "react";

import { RouterLink } from "#components/router-link";
import { NotFoundPage } from "#components/site-shell";
import { siteOrigin } from "#lib/site-path";

import { astryxMessages } from "../astryx-messages";
import {
  defaultLocale,
  isLocale,
  type Locale,
  locales,
  messages,
} from "../i18n";

import appCss from "../styles.css?url";

/** The locale in the path's first segment, if it is one. */
const localeOf = (pathname: string) =>
  Option.liftPredicate(pathname.split("/")[1] ?? "", isLocale);

const usePathLocale = (): Locale =>
  Option.getOrElse(
    localeOf(useRouterState({ select: (state) => state.location.pathname })),
    () => defaultLocale
  );

const RootDocument = ({ children }: { children: ReactNode }) => {
  const locale = usePathLocale();
  return (
    <html dir={getLocaleDirection(locale)} lang={locale}>
      <head>
        <HeadContent />
      </head>
      <body>
        <Theme theme={neutralTheme}>
          {/* Astryx's own labels (skip link, dialogs, pagination…) in the
              page language; English keeps Astryx's catalog. */}
          <InternationalizationProvider
            locale={locale}
            overrides={astryxMessages}
          >
            <LinkProvider component={RouterLink}>{children}</LinkProvider>
          </InternationalizationProvider>
        </Theme>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
};

// A path whose first segment is no locale, or a missing page under one.
const NotFound = () => <NotFoundPage locale={usePathLocale()} />;

/** The canonical address and the page's language versions (Google
 * "Localized versions of your pages"): the same path under each locale, and
 * as x-default the default locale's page rather than the negotiating `/`.
 * The query is dropped. */
const languageLinks = (locale: Locale, rest: string, origin: string) => [
  { href: `${origin}/${locale}${rest}`, rel: "canonical" },
  ...locales.map((other) => ({
    href: `${origin}/${other}${rest}`,
    hrefLang: other,
    rel: "alternate",
  })),
  {
    href: `${origin}/${defaultLocale}${rest}`,
    hrefLang: "x-default",
    rel: "alternate",
  },
];

export const Route = createRootRoute({
  head: ({ matches }) => {
    const leaf = Arr.last(matches);
    const pathLocale = Option.flatMap(leaf, (match) =>
      localeOf(match.pathname)
    );
    const locale = Option.getOrElse(pathLocale, () => defaultLocale);
    const copy = messages[locale];
    const isMissing = matches.some(
      (match) => match.status === "notFound" || match._notFound === true
    );
    // Pages for one signed-in account or for signing in: kept out of search
    // results, with no canonical or language versions.
    const isPrivate = matches.some((match) => match.staticData.isPrivate);
    // Public pages of a real locale get their language versions; a 404 has
    // none.
    const rest = Option.filter(
      Option.map(leaf, (match) =>
        match.pathname.replace(/^\/[^/]+/, "").replace(/\/$/, "")
      ),
      () => Option.isSome(pathLocale) && !isMissing && !isPrivate
    );
    return {
      links: [
        { href: appCss, rel: "stylesheet" },
        // In dev the StyleX plugin serves the app's compiled `stylex.create`
        // rules here; production builds append them to the app stylesheet.
        ...Boolean.match(import.meta.env.DEV, {
          onFalse: () => [],
          onTrue: () => [{ href: "/virtual:stylex.css", rel: "stylesheet" }],
        }),
        ...Option.match(rest, {
          onNone: () => [],
          onSome: (path) => languageLinks(locale, path, siteOrigin()),
        }),
      ],
      meta: [
        { charSet: "utf-8" },
        { content: "width=device-width, initial-scale=1", name: "viewport" },
        {
          title: Boolean.match(isMissing, {
            onFalse: () => copy.appName,
            onTrue: () => `${copy.notFoundTitle} · ${copy.appName}`,
          }),
        },
        { content: copy.siteDescription, name: "description" },
        ...Boolean.match(isPrivate, {
          onFalse: () => [],
          onTrue: () => [{ content: "noindex", name: "robots" }],
        }),
      ],
    };
  },
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
});
