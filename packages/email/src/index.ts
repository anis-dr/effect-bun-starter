import { Effect } from "effect";
import { createElement } from "react";
import { render } from "react-email";

import { emailCopy } from "./copy.js";
import {
  ResetPasswordEmail,
  type ResetPasswordEmailProps,
} from "./emails/reset-password.js";
import type { RenderedEmail } from "./rendered-email.js";

export { type EmailLocale, emailLocales } from "./copy.js";
export type { ResetPasswordEmailProps } from "./emails/reset-password.js";
export { MailError, Mailer } from "./mailer.js";
export type { RenderedEmail } from "./rendered-email.js";

/** The reset-password email as HTML and plain text, ready for `Mailer.send`. */
export const renderResetPasswordEmail = Effect.fn("Email.renderResetPassword")(
  function* (props: ResetPasswordEmailProps) {
    const element = createElement(ResetPasswordEmail, props);
    const [html, text] = yield* Effect.all(
      [
        Effect.promise(() => render(element)),
        Effect.promise(() => render(element, { plainText: true })),
      ],
      { concurrency: 2 }
    );
    return {
      html,
      subject: emailCopy[props.locale].resetPassword.subject,
      text,
    } satisfies RenderedEmail;
  }
);
