import { createServerFn } from "@tanstack/react-start";
import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server";
import { Option, Schema } from "effect";

/**
 * The visitor's colour-scheme choice. `system` follows the OS; `light` and
 * `dark` pin one. Kept in a cookie so the server renders the pinned scheme
 * on `<html data-theme>` and the first paint never flashes the other one
 * (Astryx: "For RSC / SSR, set data-theme on <html>").
 */
export const ThemeMode = Schema.Literals(["system", "light", "dark"]);
export type ThemeMode = typeof ThemeMode.Type;
export type PinnedScheme = Exclude<ThemeMode, "system">;

/** The pinned scheme, or none when the choice follows the system. */
export const pinnedScheme = (mode: ThemeMode) =>
  Option.liftPredicate(mode, (m): m is PinnedScheme => m !== "system");

const cookie = "theme";
const decodeMode = Schema.decodeUnknownOption(ThemeMode);

export const getThemeMode = createServerFn().handler(() =>
  Option.getOrElse(
    Option.flatMap(Option.fromUndefinedOr(getCookie(cookie)), decodeMode),
    (): ThemeMode => "system"
  )
);

export const setThemeMode = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(ThemeMode))
  .handler(({ data }) =>
    Option.match(pinnedScheme(data), {
      onNone: () => deleteCookie(cookie, { path: "/" }),
      onSome: (scheme) =>
        setCookie(cookie, scheme, {
          maxAge: 60 * 60 * 24 * 365,
          path: "/",
          sameSite: "lax",
        }),
    })
  );
