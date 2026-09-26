import { createServerFn } from "@tanstack/react-start";
import {
  getCookie,
  getRequestHeader,
  getRequestProtocol,
  setCookie,
} from "@tanstack/react-start/server";
import { Option, Schema } from "effect";

import {
  type Locale,
  localeCookieName,
  locales,
  negotiateLocale,
} from "../i18n";

/** Stores `locale` in the preference cookie and returns it. Not HttpOnly:
 * it holds no secret. `getRequestProtocol` honours `X-Forwarded-Proto`. */
const remember = (locale: Locale): Locale => {
  const isHttps = getRequestProtocol() === "https";
  setCookie(localeCookieName(isHttps), locale, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: isHttps,
  });
  return locale;
};

/** Where the locale-less `/` sends the visitor, remembered so a detected
 * language sticks like a chosen one. */
export const getEntryLocale = createServerFn().handler(() =>
  remember(
    negotiateLocale(
      Option.fromUndefinedOr(
        getCookie(localeCookieName(getRequestProtocol() === "https"))
      ),
      Option.fromUndefinedOr(getRequestHeader("accept-language"))
    )
  )
);

/** Remembers the language menu's choice for the next visit to `/`. */
export const setLocalePreference = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(Schema.Literals(locales)))
  .handler(({ data }) => remember(data));
