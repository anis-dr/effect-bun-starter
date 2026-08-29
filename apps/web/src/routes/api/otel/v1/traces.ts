import { createFileRoute } from "@tanstack/react-router";
import { Config, Effect, Option } from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from "effect/unstable/http";

const getTraceUrl = () =>
  `${Effect.runSync(
    Config.string("OTEL_EXPORTER_OTLP_ENDPOINT").pipe(
      Config.withDefault("http://127.0.0.1:27686")
    )
  ).replace(/\/$/, "")}/v1/traces`;

type OTelTraceProxyRequest = {
  body: string;
  contentType: string;
};

const forwardOtelTraces = Effect.fn("OTel.forwardTraces")(function* (
  data: OTelTraceProxyRequest
) {
  if (!data.body) {
    return Response.json({ error: "Empty OTLP body" }, { status: 400 });
  }

  const client = yield* HttpClient.HttpClient;
  const request = HttpClientRequest.post(getTraceUrl()).pipe(
    HttpClientRequest.bodyText(data.body, data.contentType)
  );
  const response = yield* client.execute(request);
  const body = yield* response.text;
  const contentType = Option.getOrElse(
    Option.fromUndefinedOr(response.headers["content-type"]),
    () => "application/json"
  );

  return new Response(body, {
    headers: { "content-type": contentType },
    status: response.status,
  });
});

const methodNotAllowed = () =>
  Response.json({ error: "Method not allowed" }, { status: 405 });

export const Route = createFileRoute("/api/otel/v1/traces")({
  server: {
    handlers: {
      GET: methodNotAllowed,
      POST: ({ request }) =>
        Effect.runPromise(
          Effect.promise(() => request.text()).pipe(
            Effect.flatMap((body) =>
              forwardOtelTraces({
                body,
                contentType: Option.getOrElse(
                  Option.fromNullishOr(request.headers.get("content-type")),
                  () => "application/json"
                ),
              })
            ),
            Effect.provide(FetchHttpClient.layer)
          )
        ),
    },
  },
});
