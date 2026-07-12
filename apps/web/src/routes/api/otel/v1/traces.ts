import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Config, Effect } from "effect";

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

const forwardOtelTraces = async (data: OTelTraceProxyRequest) => {
  if (!data.body) {
    return Response.json({ error: "Empty OTLP body" }, { status: 400 });
  }

  const response = await fetch(getTraceUrl(), {
    body: data.body,
    headers: { "content-type": data.contentType },
    method: "POST",
  });

  return new Response(await response.text(), {
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json",
    },
    status: response.status,
  });
};

const methodNotAllowed = () =>
  Response.json({ error: "Method not allowed" }, { status: 405 });

export const proxyOtelTraces = createServerFn({ method: "POST" })
  .validator((data: OTelTraceProxyRequest) => data)
  .handler(async ({ data }) => forwardOtelTraces(data));

export const Route = createFileRoute("/api/otel/v1/traces")({
  server: {
    handlers: {
      GET: methodNotAllowed,
      POST: async ({ request }) => {
        return forwardOtelTraces({
          body: await request.text(),
          contentType:
            request.headers.get("content-type") ?? "application/json",
        });
      },
    },
  },
});
