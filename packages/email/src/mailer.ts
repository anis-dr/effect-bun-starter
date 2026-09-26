import {
  Config,
  Context,
  Effect,
  Layer,
  Match,
  Redacted,
  Schema,
} from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from "effect/unstable/http";
import { createTransport, type Transporter } from "nodemailer";

import type { RenderedEmail } from "./rendered-email.js";

export class MailError extends Schema.TaggedError<MailError>()("MailError", {
  cause: Schema.Defect(),
}) {}

const resendEndpoint = "https://api.resend.com/emails";

/** Resend from `RESEND_API_KEY` and `EMAIL_FROM`. */
const resendConfigLayer = Layer.unwrap(
  Effect.gen(function* () {
    const apiKey = yield* Config.Redacted("RESEND_API_KEY");
    const from = yield* Config.String("EMAIL_FROM");
    return Mailer.layerResend(apiKey, from);
  })
).pipe(Layer.provide(FetchHttpClient.layer));

/** Nodemailer over SMTP from `SMTP_URL` and `EMAIL_FROM`. */
const smtpConfigLayer = Layer.unwrap(
  Effect.gen(function* () {
    const smtpUrl = yield* Config.Redacted("SMTP_URL");
    const from = yield* Config.String("EMAIL_FROM");
    return Mailer.layerNodemailer(
      createTransport(Redacted.value(smtpUrl)),
      from
    );
  })
);

/**
 * Sends every email the app sends. Render one with its `render…Email` function, then
 * hand it here with its recipient; new emails add a template and a render
 * function, never a second way to send.
 *
 * Two implementations: Resend's HTTP API in production, Nodemailer over SMTP
 * locally (Mailpit). `Mailer.layerConfig` picks one from `MAIL_TRANSPORT`.
 */
export class Mailer extends Context.Service<
  Mailer,
  {
    readonly send: (
      to: string,
      email: RenderedEmail
    ) => Effect.Effect<void, MailError>;
  }
>()("@effect-bun-starter/email/Mailer") {
  /** Nodemailer over any transport, sending as `from`. */
  static readonly layerNodemailer = (transport: Transporter, from: string) =>
    Layer.succeed(
      Mailer,
      Mailer.of({
        send: Effect.fn("Mailer.send")(function* (to, email) {
          yield* Effect.annotateCurrentSpan({
            "email.subject": email.subject,
            "email.transport": "nodemailer",
          });
          yield* Effect.tryPromise({
            catch: (cause) => new MailError({ cause }),
            try: () =>
              transport.sendMail({
                from,
                html: email.html,
                subject: email.subject,
                text: email.text,
                to,
              }),
          });
        }),
      })
    );

  /** Resend's send-email API, sending as `from` (a verified domain). */
  static readonly layerResend = (
    apiKey: Redacted.Redacted<string>,
    from: string
  ) =>
    Layer.effect(
      Mailer,
      Effect.gen(function* () {
        const client = HttpClient.filterStatusOk(yield* HttpClient.HttpClient);
        return Mailer.of({
          send: Effect.fn("Mailer.send")(
            function* (to, email) {
              yield* Effect.annotateCurrentSpan({
                "email.subject": email.subject,
                "email.transport": "resend",
              });
              const request = yield* HttpClientRequest.post(
                resendEndpoint
              ).pipe(
                HttpClientRequest.bearerToken(Redacted.value(apiKey)),
                HttpClientRequest.bodyJson({
                  from,
                  html: email.html,
                  subject: email.subject,
                  text: email.text,
                  to: [to],
                })
              );
              yield* client.execute(request);
            },
            Effect.mapError((cause) => new MailError({ cause }))
          ),
        });
      })
    );

  /**
   * The Mailer the environment asks for: `MAIL_TRANSPORT=resend` in
   * production, `smtp` (the default) in development.
   */
  static readonly layerConfig = Layer.unwrap(
    Effect.gen(function* () {
      const transport = yield* Config.Literals(
        ["resend", "smtp"],
        "MAIL_TRANSPORT"
      ).pipe(Config.withDefault("smtp"));
      return Match.value(transport).pipe(
        Match.when("resend", () => resendConfigLayer),
        Match.orElse(() => smtpConfigLayer)
      );
    })
  );
}
