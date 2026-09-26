import { assert, it, layer } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { createTransport, type SendMailOptions } from "nodemailer";

import {
  Mailer,
  renderResetPasswordEmail,
  renderVerifyEmail,
} from "../src/index.js";

const url = "http://localhost:3002/api/auth/reset-password/token-123";

it.effect("renders the reset email in the account's language", () =>
  Effect.gen(function* () {
    const french = yield* renderResetPasswordEmail({
      appName: "Acme",
      locale: "fr",
      name: "Alex",
      url,
    });
    assert.strictEqual(french.subject, "Réinitialisez votre mot de passe");
    assert.include(french.html, 'lang="fr"');
    assert.include(french.html, "Bonjour Alex");
    assert.include(french.html, "votre compte Acme");
    // Clients that block HTML still get a working link.
    assert.include(french.html, `href="${url}"`);
    assert.include(french.text, url);

    const english = yield* renderResetPasswordEmail({
      appName: "Acme",
      locale: "en",
      name: "Alex",
      url,
    });
    assert.strictEqual(english.subject, "Reset your password");
    assert.include(english.html, 'lang="en"');
    assert.include(english.text, "your Acme account");
  })
);

it.effect(
  "renders the address confirmation in the sign-up page's language",
  () =>
    Effect.gen(function* () {
      const link =
        "http://localhost:3002/api/auth/verify-email?token=verify-123&callbackURL=%2Ffr";
      const french = yield* renderVerifyEmail({
        appName: "Acme",
        locale: "fr",
        name: "Alex",
        url: link,
      });
      assert.strictEqual(french.subject, "Confirmez votre adresse e-mail");
      assert.include(french.html, 'lang="fr"');
      assert.include(french.html, "Confirmer mon adresse");
      assert.include(french.html, "votre compte Acme");
      assert.include(french.text, link);

      const english = yield* renderVerifyEmail({
        appName: "Acme",
        locale: "en",
        name: "Alex",
        url: link,
      });
      assert.strictEqual(english.subject, "Confirm your email");
      assert.include(english.text, "your Acme account");
    })
);

class SmtpRefusedError extends Schema.TaggedError<SmtpRefusedError>()(
  "SmtpRefusedError",
  {
    message: Schema.String,
  }
) {}

const from = "App <no-reply@example.com>";
const email = { html: "<p>Hi</p>", subject: "Hello", text: "Hi" };
const sent: Array<
  Pick<SendMailOptions, "from" | "html" | "subject" | "text" | "to">
> = [];

// Nodemailer's JSON transport never connects; a compile plugin sees each
// message as Mailer handed it over.
const recording = createTransport({ jsonTransport: true });
recording.use("compile", (mail, done) => {
  const { from: sender, html, subject, text, to } = mail.data;
  sent.push({ from: sender, html, subject, text, to });
  done();
});

layer(Mailer.layerNodemailer(recording, from))("Mailer", (test) => {
  test.effect("sends from the configured address to the recipient", () =>
    Effect.gen(function* () {
      const mailer = yield* Mailer;
      yield* mailer.send("alex@example.com", email);
      assert.deepStrictEqual(sent, [
        {
          from,
          html: "<p>Hi</p>",
          subject: "Hello",
          text: "Hi",
          to: "alex@example.com",
        },
      ]);
    })
  );
});

const refusing = createTransport({ jsonTransport: true });
refusing.use("compile", (_mail, done) =>
  done(new SmtpRefusedError({ message: "550 mailbox unavailable" }))
);

layer(Mailer.layerNodemailer(refusing, from))("Mailer refused", (test) => {
  test.effect("fails with MailError when the server refuses", () =>
    Effect.gen(function* () {
      const mailer = yield* Mailer;
      const error = yield* Effect.flip(mailer.send("alex@example.com", email));
      assert.strictEqual(error._tag, "MailError");
    })
  );
});
