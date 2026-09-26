import { assert, it } from "@effect/vitest";
import { Cause } from "effect";

import { messages } from "../src/i18n.js";
import { authFailure, authFailureMessage } from "../src/lib/auth-client.js";

// Better Fetch's rejection when the API refuses, or anything else thrown.
interface Refusal {
  readonly error: { readonly code?: string; readonly message: string };
  readonly status: number;
}

// What the page says for it.
const shown = (rejection: Refusal | string) =>
  authFailureMessage(
    messages.fr,
    Cause.fail(authFailure(rejection)),
    "fallback"
  );

it("explains known refusals in the page's language", () => {
  assert.strictEqual(
    shown({
      error: {
        code: "INVALID_EMAIL_OR_PASSWORD",
        message: "Invalid email or password",
      },
      status: 401,
    }),
    "L’e-mail ou le mot de passe est incorrect."
  );
  assert.strictEqual(
    shown({ error: { message: "Too many requests" }, status: 429 }),
    "Trop de tentatives. Patientez une minute, puis réessayez."
  );
});

it("never shows the API's English for anything else", () => {
  assert.strictEqual(
    shown({
      error: { code: "FAILED_TO_CREATE_USER", message: "Failed" },
      status: 500,
    }),
    "fallback"
  );
  assert.strictEqual(shown("network down"), "fallback");
});
