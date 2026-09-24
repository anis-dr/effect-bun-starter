import { DatabaseLive } from "@effect-bun-starter/database";
import * as NodeSdk from "@effect/opentelemetry/NodeSdk";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAMESPACE,
} from "@opentelemetry/semantic-conventions";
import { Cause, Config, Effect, Exit, Layer, Match, Option } from "effect";
import {
  HttpMiddleware,
  HttpRouter,
  HttpServerError,
  HttpServerRequest,
} from "effect/unstable/http";

import { AppLive } from "./api.js";

const HttpLive = AppLive.pipe(
  // ponytail: local web origin only; make configurable when deployed origins exist.
  Layer.provide(
    HttpRouter.cors({
      allowedMethods: ["GET", "POST", "OPTIONS"],
      credentials: true,
      allowedOrigins: ["http://localhost:3000"],
    })
  )
);

const requestLogger = HttpMiddleware.make((httpApp) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const exit = yield* Effect.exit(httpApp);
    const [response, failureCause] = exit.pipe(
      Exit.match({
        onFailure: HttpServerError.causeResponseStripped,
        onSuccess: (value) =>
          [value, Option.none()] satisfies readonly [
            typeof value,
            Option.Option<never>,
          ],
      })
    );
    const status = response.status;
    const details = Option.map(failureCause, Cause.pretty);
    const detailSuffix = Option.match(details, {
      onNone: () => "",
      onSome: (detail) => `\n${detail}`,
    });
    const message = Match.value(status).pipe(
      Match.when(
        (value) => value < 400,
        () => "Sent HTTP response"
      ),
      Match.orElse(() => `HTTP request completed with ${status}${detailSuffix}`)
    );
    const log = Match.value(status).pipe(
      Match.when(
        (value) => value >= 500,
        () => Effect.logError(message)
      ),
      Match.when(
        (value) => value >= 400,
        () => Effect.logWarning(message)
      ),
      Match.orElse(() => Effect.logInfo(message))
    );
    const requestUrl = Option.getOrElse(
      Option.fromUndefinedOr(request.url.split(/[?#]/, 1)[0]),
      () => request.url
    );

    yield* log.pipe(
      Effect.annotateLogs({
        "http.method": request.method,
        "http.url": requestUrl,
        "http.status": status,
      })
    );

    return yield* exit;
  })
);

const ObservabilityLive = NodeSdk.layer(
  Effect.gen(function* observabilityConfig() {
    const otlpEndpoint = yield* Config.string(
      "OTEL_EXPORTER_OTLP_ENDPOINT"
    ).pipe(Config.withDefault("http://127.0.0.1:27686"));
    const deploymentEnvironment = yield* Config.string(
      "OTEL_DEPLOYMENT_ENVIRONMENT"
    ).pipe(Config.withDefault("development"));
    const serviceVersion = yield* Config.string("OTEL_SERVICE_VERSION").pipe(
      Config.withDefault("0.0.0")
    );
    const otlpBaseUrl = otlpEndpoint.replace(/\/$/, "");

    return {
      logRecordProcessor: [
        new BatchLogRecordProcessor({
          exporter: new OTLPLogExporter({
            url: `${otlpBaseUrl}/v1/logs`,
          }),
        }),
      ],
      resource: {
        attributes: {
          [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: deploymentEnvironment,
          [ATTR_SERVICE_NAMESPACE]: "effect-bun-starter",
        },
        serviceName: "effect-bun-starter-api",
        serviceVersion,
      },
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

  return yield* HttpRouter.serve(HttpLive, {
    disableLogger: true,
    middleware: requestLogger,
  }).pipe(
    Layer.provide(BunHttpServer.layer({ port })),
    Layer.provide(DatabaseLive),
    Layer.provide(ObservabilityLive),
    Layer.launch
  );
});

BunRuntime.runMain(main);
