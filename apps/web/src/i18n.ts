import { Array as Arr, Boolean, Option, Order } from "effect";

/** The app's languages. Adding one is a row here, in `localeNames`,
 * `messages` and `astryx-messages.ts`. */
export const locales = ["en", "fr"] satisfies readonly ["en", "fr"];

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const isLocale = (value: string): value is Locale =>
  locales.some((locale) => locale === value);

/** Cookie keeping the language the visitor picked (or was given) last.
 * Over HTTPS it takes the `__Host-` prefix, which binds it to this host and
 * requires `Secure`; browsers refuse that prefix on `http://localhost`, so
 * plain-http dev keeps the bare name. */
export const localeCookieName = (isHttps: boolean) =>
  Boolean.match(isHttps, {
    onFalse: () => "locale",
    onTrue: () => "__Host-locale",
  });

/** One `Accept-Language` range as a supported locale and its weight. */
const weightedLocale = (range: string) => {
  const [tag = "", ...params] = range.split(";");
  const [family = ""] = tag.trim().toLowerCase().split("-");
  const quality = Option.getOrElse(
    Option.map(
      Arr.findFirst(params, (param) => param.trim().startsWith("q=")),
      (param) => Number(param.trim().slice(2))
    ),
    () => 1
  );
  return Option.filter(
    Option.map(
      Option.liftPredicate(family, isLocale),
      (locale) => [locale, quality] satisfies readonly [Locale, number]
    ),
    ([, weight]) => weight > 0
  );
};

/**
 * The locale for the locale-less entry `/`: a valid saved choice, else the
 * best-weighted supported language family in `Accept-Language` (ties keep
 * header order), else the default.
 */
export const negotiateLocale = (
  preference: Option.Option<string>,
  acceptLanguage: Option.Option<string>
): Locale =>
  Option.getOrElse(
    Option.orElse(Option.filter(preference, isLocale), () =>
      Option.flatMap(acceptLanguage, (header) =>
        Option.map(
          Arr.head(
            Arr.sortWith(
              Arr.getSomes(header.split(",").map(weightedLocale)),
              ([, weight]) => weight,
              Order.flip(Order.Number)
            )
          ),
          ([locale]) => locale
        )
      )
    ),
    () => defaultLocale
  );

const localePrefix = new RegExp(`^/(${locales.join("|")})(?=[/?#]|$)`);

/**
 * `path` (pathname and search) in another language: the first segment
 * becomes `to`, and so does the first segment of a `?redirect=` path, since
 * the visitor chose the language for where they go next too.
 */
export const switchLocale = (path: string, to: Locale): string => {
  // ponytail: any fixed origin; only the path and search come back out.
  const url = new URL(path, "https://app.invalid");
  const rest = url.pathname.split("/").slice(2).join("/");
  Option.map(Option.fromNullOr(url.searchParams.get("redirect")), (target) =>
    url.searchParams.set("redirect", target.replace(localePrefix, `/${to}`))
  );
  return `/${to}/${rest}${url.search}`;
};

/** Native language names for the language menu; never translated. */
export const localeNames = {
  en: "English",
  fr: "Français",
} satisfies Record<Locale, string>;

const english = {
  apiChecking: "API checking",
  apiStatus: "API {status}",
  apiUnavailable: "API unavailable",
  appName: "Effect Bun Starter",
  backHome: "Back to home",
  homeHeading: "Effect Bun Starter Web",
  homeLead: "Typed client connected through Effect Atom.",
  language: "Language",
  loaderStatus: "Loader API {status}",
  navigation: "Main navigation",
  notFoundBody: "That page does not exist.",
  notFoundTitle: "Not found",
  ping: "Ping API",
  pingFailed: "Ping failed",
  pinging: "Pinging…",
  siteDescription:
    "An Effect, Bun and TanStack Start app with a typed API client.",
  themeMatchSystem: "Match the system theme",
  themeUseDark: "Use the dark theme",
  themeUseLight: "Use the light theme",
};

type Messages = { readonly [Key in keyof typeof english]: string };
export type Copy = Messages;

export const messages = {
  en: english,
  fr: {
    apiChecking: "Vérification de l’API",
    apiStatus: "API\u00a0: {status}",
    apiUnavailable: "API indisponible",
    appName: "Effect Bun Starter",
    backHome: "Retour à l’accueil",
    homeHeading: "Effect Bun Starter Web",
    homeLead: "Client typé connecté par Effect Atom.",
    language: "Langue",
    loaderStatus: "API du loader\u00a0: {status}",
    navigation: "Navigation principale",
    notFoundBody: "Cette page n’existe pas.",
    notFoundTitle: "Page introuvable",
    ping: "Tester l’API",
    pingFailed: "Échec du test",
    pinging: "Test en cours…",
    siteDescription:
      "Une application Effect, Bun et TanStack Start avec un client d’API typé.",
    themeMatchSystem: "Suivre le thème du système",
    themeUseDark: "Passer au thème sombre",
    themeUseLight: "Passer au thème clair",
  },
} satisfies Record<Locale, Messages>;

/** Replaces `{name}` placeholders: `fill("Hi {name}", { name: "Ada" })`. */
export const fill = (
  template: string,
  values: Readonly<Partial<Record<string, string>>>
): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);

/** `<title>` for a route: "Sign in · Effect Bun Starter". */
export const documentTitle = (locale: Locale, pick: (copy: Copy) => string) => {
  const copy = messages[locale];
  return { meta: [{ title: `${pick(copy)} · ${copy.appName}` }] };
};
