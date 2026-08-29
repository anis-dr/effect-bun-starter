import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { Config, Effect, Option } from "effect";

declare global {
  var __effectBunStarterWebOtelSdk: Option.Option<NodeSDK>;
}

if (!("__effectBunStarterWebOtelSdk" in globalThis)) {
  globalThis.__effectBunStarterWebOtelSdk = Option.none();
}

if (Option.isNone(globalThis.__effectBunStarterWebOtelSdk)) {
  const otlpEndpoint = Effect.runSync(
    Config.string("OTEL_EXPORTER_OTLP_ENDPOINT").pipe(
      Config.withDefault("http://127.0.0.1:27686")
    )
  ).replace(/\/$/, "");
  const otlpTraceUrl = `${otlpEndpoint}/v1/traces`;
  const otlpTraceEndpoint = new URL(otlpTraceUrl);

  const sdk = new NodeSDK({
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-http": {
          disableIncomingRequestInstrumentation: true,
          ignoreOutgoingRequestHook: (request) =>
            request.path === otlpTraceEndpoint.pathname &&
            request.host === otlpTraceEndpoint.host,
        },
        "@opentelemetry/instrumentation-undici": {
          ignoreRequestHook: (request) =>
            new URL(request.path, request.origin).pathname ===
              otlpTraceEndpoint.pathname &&
            request.origin === otlpTraceEndpoint.origin,
        },
      }),
    ],
    logRecordProcessors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          url: `${otlpEndpoint}/v1/logs`,
        }),
      }),
    ],
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "effect-bun-starter-web",
    }),
    traceExporter: new OTLPTraceExporter({
      url: otlpTraceUrl,
    }),
  });

  globalThis.__effectBunStarterWebOtelSdk = Option.some(sdk);
  sdk.start();
}
