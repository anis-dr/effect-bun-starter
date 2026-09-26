import { expect, it } from "@effect/vitest";
import { Option } from "effect";

import {
  localeCookieName,
  negotiateLocale,
  switchLocale,
} from "../src/i18n.js";

const entryCases = [
  ["a saved French choice", Option.some("fr"), Option.some("en-GB"), "fr"],
  ["no choice, fr-CA", Option.none(), Option.some("fr-CA,fr;q=0.9"), "fr"],
  ["neither", Option.none(), Option.none(), "en"],
  ["a tampered cookie", Option.some("de"), Option.some("fr-FR"), "fr"],
  ["weights", Option.none(), Option.some("en;q=0.5, fr-BE;q=0.8, de"), "fr"],
  ["a refused language", Option.none(), Option.some("fr;q=0, *"), "en"],
  ["no supported family", Option.none(), Option.some("de-DE,es;q=0.9"), "en"],
] satisfies ReadonlyArray<
  readonly [string, Option.Option<string>, Option.Option<string>, string]
>;

it.each(entryCases)(
  "sends the locale-less entry to the right locale given %s",
  (_, preference, acceptLanguage, expected) => {
    expect(negotiateLocale(preference, acceptLanguage)).toBe(expected);
  }
);

it("names the locale cookie __Host- only over HTTPS", () => {
  expect(localeCookieName(true)).toBe("__Host-locale");
  expect(localeCookieName(false)).toBe("locale");
});

it("switches the path and its ?redirect= into the chosen locale", () => {
  expect(switchLocale("/en", "fr")).toBe("/fr/");
  expect(
    switchLocale("/en/sign-in?redirect=%2Fen%2Faccount%3Ftab%3D2", "fr")
  ).toBe("/fr/sign-in?redirect=%2Ffr%2Faccount%3Ftab%3D2");
  // A redirect that merely starts with a locale's letters keeps them.
  expect(switchLocale("/fr/sign-in?redirect=%2Fentries", "en")).toBe(
    "/en/sign-in?redirect=%2Fentries"
  );
});
