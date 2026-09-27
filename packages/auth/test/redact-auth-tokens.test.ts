import { expect, it } from "@effect/vitest";

import { redactAuthTokens } from "../src/redact-auth-tokens.js";

it("replaces the reset link's path token with the route's parameter", () => {
  expect(
    redactAuthTokens(
      "/api/auth/reset-password/Xk9pQ2rT?callbackURL=%2Ffr%2Freset-password"
    )
  ).toBe("/api/auth/reset-password/:token?callbackURL=%2Ffr%2Freset-password");
  expect(
    redactAuthTokens("http://localhost:3002/api/auth/reset-password/Xk9pQ2rT")
  ).toBe("http://localhost:3002/api/auth/reset-password/:token");
});

it("hides every token query value, in URLs and in bare query strings", () => {
  expect(
    redactAuthTokens(
      "http://localhost:3000/fr/reset-password?token=Xk9pQ2rT#form"
    )
  ).toBe("http://localhost:3000/fr/reset-password?token=REDACTED#form");
  expect(
    redactAuthTokens("/api/auth/verify-email?callbackURL=%2Fen&token=eyJhbGci")
  ).toBe("/api/auth/verify-email?callbackURL=%2Fen&token=REDACTED");
  expect(redactAuthTokens("token=eyJhbGci&callbackURL=%2Fen")).toBe(
    "token=REDACTED&callbackURL=%2Fen"
  );
});

it("hides token values whose parameter name is percent-encoded", () => {
  expect(
    redactAuthTokens(
      "/api/auth/verify-email?%74oken=usable-secret&callbackURL=%2Fen"
    )
  ).toBe("/api/auth/verify-email?%74oken=REDACTED&callbackURL=%2Fen");
  expect(
    redactAuthTokens(
      "http://localhost:3000/fr/reset-password?%54%6fken=x&%74%6F%6B%65%6E=eyJhbGci#form"
    )
  ).toBe(
    "http://localhost:3000/fr/reset-password?%54%6fken=x&%74%6F%6B%65%6E=REDACTED#form"
  );
  expect(redactAuthTokens("callbackURL=%2Fen&t%6fken=eyJhbGci")).toBe(
    "callbackURL=%2Fen&t%6fken=REDACTED"
  );
});

it("hides a token even when an earlier segment contains an equals sign", () => {
  expect(redactAuthTokens("/files/a=b?token=eyJhbGci")).toBe(
    "/files/a=b?token=REDACTED"
  );
});

it("leaves URLs without tokens as they are", () => {
  expect(redactAuthTokens("/api/auth/get-session")).toBe(
    "/api/auth/get-session"
  );
  expect(redactAuthTokens("/en/reset-password")).toBe("/en/reset-password");
  expect(redactAuthTokens("/stores?q=tokens&pagetoken=1")).toBe(
    "/stores?q=tokens&pagetoken=1"
  );
  expect(redactAuthTokens("/stores?%zz=1&q=%E0%A4%A")).toBe(
    "/stores?%zz=1&q=%E0%A4%A"
  );
});
