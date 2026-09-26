import { type EmailLocale, emailLocales } from "@effect-bun-starter/email";
import { Option } from "effect";

const isEmailLocale = (segment: string): segment is EmailLocale =>
  emailLocales.some((locale) => locale === segment);

/**
 * The language of the page that asked for a mailed link (a password reset,
 * an address confirmation). Better Auth's link carries that page as
 * `callbackURL` (`/fr/reset-password`, `/fr?verified=1`); its first path
 * segment is the locale. Anything else falls back to English, the web app's
 * default.
 */
export const localeOfLink = (url: string): EmailLocale =>
  Option.fromNullishOr(new URL(url).searchParams.get("callbackURL")).pipe(
    Option.flatMap((callback) =>
      Option.fromUndefinedOr(new URL(callback, url).pathname.split("/")[1])
    ),
    Option.filter(isEmailLocale),
    Option.getOrElse((): EmailLocale => "en")
  );
