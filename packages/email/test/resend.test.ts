import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option, Redacted, Schema } from "effect";
import {
  HttpClient,
  type HttpClientRequest,
  HttpClientResponse,
} from "effect/unstable/http";

import { Mailer } from "../src/index.js";

const from = "App <no-reply@example.com>";
const email = { html: "<p>Hi</p>", subject: "Hello", text: "Hi" };

const ResendBody = Schema.fromJsonString(
  Schema.Struct({
    from: Schema.String,
    html: Schema.String,
    subject: Schema.String,
    text: Schema.String,
    to: Schema.Array(Schema.String),
  })
);

// Resend's API stand-in: records each request and answers with `status`.
function answer(
  requests: HttpClientRequest.HttpClientRequest[],
  status: number,
  request: HttpClientRequest.HttpClientRequest
) {
  requests.push(request);
  return Effect.succeed(
    HttpClientResponse.fromWeb(
      request,
      new Response('{"id":"email_1"}', { status })
    )
  );
}

const fakeResend = (
  requests: HttpClientRequest.HttpClientRequest[],
  status: number
) => HttpClient.make((request) => answer(requests, status, request));

const resendLayer = (
  requests: HttpClientRequest.HttpClientRequest[],
  status: number
) =>
  Mailer.layerResend(Redacted.make("re_test_key"), from).pipe(
    Layer.provide(
      Layer.succeed(HttpClient.HttpClient, fakeResend(requests, status))
    )
  );

const bodyText = (request: HttpClientRequest.HttpClientRequest) =>
  Option.map(
    Option.liftPredicate(request.body, (body) => body._tag === "Uint8Array"),
    (body) => new TextDecoder().decode(body.body)
  );

const sent: HttpClientRequest.HttpClientRequest[] = [];

layer(resendLayer(sent, 200))("Resend Mailer", (it) => {
  it.effect("posts the email to Resend with the API key", () =>
    Effect.gen(function* () {
      const mailer = yield* Mailer;
      yield* mailer.send("alex@example.com", email);
      const [request] = sent;
      assert.isDefined(request);
      assert.strictEqual(request.method, "POST");
      assert.strictEqual(request.url, "https://api.resend.com/emails");
      assert.strictEqual(request.headers.authorization, "Bearer re_test_key");
      const body = yield* Schema.decodeUnknownEffect(ResendBody)(
        Option.getOrElse(bodyText(request), () => "")
      );
      assert.deepStrictEqual(body, {
        from,
        html: "<p>Hi</p>",
        subject: "Hello",
        text: "Hi",
        to: ["alex@example.com"],
      });
    })
  );
});

layer(resendLayer([], 422))("Resend Mailer refused", (it) => {
  it.effect("fails with MailError when Resend refuses", () =>
    Effect.gen(function* () {
      const mailer = yield* Mailer;
      const error = yield* Effect.flip(mailer.send("alex@example.com", email));
      assert.strictEqual(error._tag, "MailError");
    })
  );
});
