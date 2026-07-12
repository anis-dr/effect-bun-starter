import "@tanstack/react-start/client-only";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  SimpleSpanProcessor,
  WebTracerProvider,
} from "@opentelemetry/sdk-trace-web";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { Config, ConfigProvider, Effect } from "effect";

declare global {
  // eslint-disable-next-line no-var
  var __effectBunStarterWebClientOtelStarted: boolean | undefined;
}

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const startBrowserTelemetry = () => {
  if (globalThis.__effectBunStarterWebClientOtelStarted) {
    return;
  }

  globalThis.__effectBunStarterWebClientOtelStarted = true;

  const configProvider = ConfigProvider.fromUnknown(import.meta.env);

  const traceUrl = Effect.runSync(
    Config.string("VITE_OTEL_EXPORTER_OTLP_TRACES_URL").pipe(
      Config.withDefault("/api/otel/v1/traces"),
      Effect.provideService(ConfigProvider.ConfigProvider, configProvider)
    )
  );
  const apiUrl = Effect.runSync(
    Config.string("VITE_API_URL").pipe(
      Config.withDefault("http://localhost:3002"),
      Effect.provideService(ConfigProvider.ConfigProvider, configProvider)
    )
  ).replace(/\/$/, "");

  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "effect-bun-starter-web-client",
    }),
    spanProcessors: [
      new SimpleSpanProcessor(
        new OTLPTraceExporter({
          url: traceUrl,
        })
      ),
    ],
  });

  provider.register({ contextManager: new ZoneContextManager() });

  const resolvedTraceUrl = new URL(traceUrl, globalThis.location.origin).href;
  const apiUrlPattern = new RegExp(`^${escapeRegExp(apiUrl)}(?:/|$)`);

  registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [
      new FetchInstrumentation({
        ignoreUrls: [traceUrl, resolvedTraceUrl, /\/__tsd\//],
        propagateTraceHeaderCorsUrls: [apiUrlPattern],
      }),
    ],
  });
};
