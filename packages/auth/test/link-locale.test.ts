import { expect, it } from "@effect/vitest";

import { localeOfLink } from "../src/link-locale.js";

const resetLink = (callbackURL: string) =>
  `http://localhost:3002/api/auth/reset-password/token?callbackURL=${encodeURIComponent(callbackURL)}`;

it("writes the email in the language of the page that asked", () => {
  expect(
    localeOfLink(resetLink("http://localhost:3000/fr/reset-password"))
  ).toBe("fr");
  expect(localeOfLink(resetLink("/en/reset-password"))).toBe("en");
  expect(
    localeOfLink(
      "http://localhost:3002/api/auth/verify-email?token=abc&callbackURL=http%3A%2F%2Flocalhost%3A3000%2Ffr%3Fverified%3D1"
    )
  ).toBe("fr");
});

it("falls back to English for any other page", () => {
  expect(
    localeOfLink(resetLink("http://localhost:3000/de/reset-password"))
  ).toBe("en");
  expect(localeOfLink(resetLink("http://localhost:3000/"))).toBe("en");
  expect(
    localeOfLink("http://localhost:3002/api/auth/reset-password/token")
  ).toBe("en");
  expect(
    localeOfLink(
      "http://localhost:3002/api/auth/verify-email?token=abc&callbackURL=%2F"
    )
  ).toBe("en");
});
