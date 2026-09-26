import { Schema } from "effect";

import type { Copy } from "../i18n";

// ponytail: the API validates the address; this only catches typos early.
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

/** An account email, trimmed, with messages in the interface's language. */
export const emailField = (copy: Copy) =>
  Schema.Trim.check(
    Schema.isNonEmpty({ message: copy.emailRequired }),
    Schema.isPattern(emailPattern, { message: copy.emailInvalid })
  );

/** A new password: at least 8 characters, Better Auth's default minimum. */
export const passwordField = (copy: Copy) =>
  Schema.String.check(
    Schema.isMinLength(8, { message: copy.passwordRequired })
  );

/** Attributes for an account email input (see `inputAttributes`): typed left
 * to right in every language, never spell-checked or capitalised. */
export const emailAttributes = (enterkeyhint: "next" | "send") => ({
  autocapitalize: "none",
  autocomplete: "username",
  dir: "ltr",
  enterkeyhint,
  required: "",
  spellcheck: "false",
});
