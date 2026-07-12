import { AuthRoutesLive } from "@effect-bun-starter/auth";
import { DatabaseLive } from "@effect-bun-starter/database";
import * as NodeSdk from "@effect/opentelemetry/NodeSdk";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { Config, Effect, Layer } from "effect";
import { HttpRouter } from "effect/unstable/http";

import { ApiLive } from "./api.js";

const AppLive = Layer.mergeAll(ApiLive, AuthRoutesLive).pipe(
  // ponytail: local web origin only; make configurable when deployed origins exist.
  Layer.provide(
    HttpRouter.cors({
      allowedMethods: ["GET", "POST", "OPTIONS"],
      allowedOrigins: ["http://localhost:3000"],
    })
  )
);

const ObservabilityLive = NodeSdk.layer(
  Effect.gen(function* observabilityConfig() {
    const otlpEndpoint = yield* Config.string(
      "OTEL_EXPORTER_OTLP_ENDPOINT"
    ).pipe(Config.withDefault("http://127.0.0.1:27686"));
    const otlpBaseUrl = otlpEndpoint.replace(/\/$/, "");

    return {
      logRecordProcessor: [
        new BatchLogRecordProcessor({
          exporter: new OTLPLogExporter({
            url: `${otlpBaseUrl}/v1/logs`,
          }),
        }),
      ],
      resource: { serviceName: "effect-bun-starter-api" },
      spanProcessor: [
        new BatchSpanProcessor(
          new OTLPTraceExporter({ url: `${otlpBaseUrl}/v1/traces` })
        ),
      ],
    };
  })
);

const main = Effect.gen(function* main() {
  const port = yield* Config.port("PORT").pipe(Config.withDefault(3002));

  return yield* HttpRouter.serve(AppLive).pipe(
    Layer.provide(BunHttpServer.layer({ port })),
    Layer.provide(DatabaseLive),
    Layer.provide(ObservabilityLive),
    Layer.launch
  );
});

BunRuntime.runMain(main);
