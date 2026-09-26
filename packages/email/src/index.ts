import { Effect } from "effect";
import { createElement, type ReactElement } from "react";
import { render } from "react-email";

import { emailCopy } from "./copy.js";
import { ResetPasswordEmail } from "./emails/reset-password.js";
import { VerifyEmailEmail } from "./emails/verify-email.js";
import type { LinkEmailProps } from "./link-email.js";
import type { RenderedEmail } from "./rendered-email.js";

export { type EmailLocale, emailLocales } from "./copy.js";
export type { LinkEmailProps } from "./link-email.js";
export { MailError, Mailer } from "./mailer.js";
export type { RenderedEmail } from "./rendered-email.js";

/** `element` as HTML and plain text under `subject`, ready for `Mailer.send`. */
const renderEmail = Effect.fn("Email.render")(function* (
  element: ReactElement,
  subject: string
) {
  const [html, text] = yield* Effect.all(
    [
      Effect.promise(() => render(element)),
      Effect.promise(() => render(element, { plainText: true })),
    ],
    { concurrency: 2 }
  );
  return { html, subject, text } satisfies RenderedEmail;
});

/** The reset-password email, ready for `Mailer.send`. */
export const renderResetPasswordEmail = Effect.fn("Email.renderResetPassword")(
  function* (props: LinkEmailProps) {
    return yield* renderEmail(
      createElement(ResetPasswordEmail, props),
      emailCopy[props.locale].resetPassword.subject
    );
  }
);

/** The email that confirms an account's address, ready for `Mailer.send`. */
export const renderVerifyEmail = Effect.fn("Email.renderVerifyEmail")(
  function* (props: LinkEmailProps) {
    return yield* renderEmail(
      createElement(VerifyEmailEmail, props),
      emailCopy[props.locale].verifyEmail.subject
    );
  }
);
