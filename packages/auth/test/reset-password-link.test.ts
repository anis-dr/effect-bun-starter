import { expect, it } from "@effect/vitest";

import { localeOfResetLink } from "../src/reset-password-link.js";

const link = (callbackURL: string) =>
  `http://localhost:3002/api/auth/reset-password/token?callbackURL=${encodeURIComponent(callbackURL)}`;

it("writes the email in the language of the page that asked", () => {
  expect(
    localeOfResetLink(link("http://localhost:3000/fr/reset-password"))
  ).toBe("fr");
  expect(localeOfResetLink(link("/en/reset-password"))).toBe("en");
});

it("falls back to English for any other page", () => {
  expect(
    localeOfResetLink(link("http://localhost:3000/de/reset-password"))
  ).toBe("en");
  expect(localeOfResetLink(link("http://localhost:3000/"))).toBe("en");
  expect(
    localeOfResetLink("http://localhost:3002/api/auth/reset-password/token")
  ).toBe("en");
});
