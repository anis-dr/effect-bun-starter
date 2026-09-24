import "@tanstack/react-start/client-only";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchSpanProcessor,
  WebTracerProvider,
} from "@opentelemetry/sdk-trace-web";
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_NAMESPACE,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { Config, ConfigProvider, Effect, Option } from "effect";

declare global {
  var __effectBunStarterWebClientOtelStarted: Option.Option<true>;
}

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const startBrowserTelemetry = () => {
  if (!("__effectBunStarterWebClientOtelStarted" in globalThis)) {
    globalThis.__effectBunStarterWebClientOtelStarted = Option.none();
  }
  if (Option.isSome(globalThis.__effectBunStarterWebClientOtelStarted)) {
    return;
  }

  globalThis.__effectBunStarterWebClientOtelStarted = Option.some(true);

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
  const deploymentEnvironment = Effect.runSync(
    Config.string("VITE_OTEL_DEPLOYMENT_ENVIRONMENT").pipe(
      Config.withDefault("development"),
      Effect.provideService(ConfigProvider.ConfigProvider, configProvider)
    )
  );
  const serviceVersion = Effect.runSync(
    Config.string("VITE_OTEL_SERVICE_VERSION").pipe(
      Config.withDefault("0.0.0"),
      Effect.provideService(ConfigProvider.ConfigProvider, configProvider)
    )
  );

  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: deploymentEnvironment,
      [ATTR_SERVICE_NAME]: "effect-bun-starter-web-client",
      [ATTR_SERVICE_NAMESPACE]: "effect-bun-starter",
      [ATTR_SERVICE_VERSION]: serviceVersion,
    }),
    spanProcessors: [
      new BatchSpanProcessor(
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
        semconvStabilityOptIn: "http",
      }),
    ],
  });
};
