import { Api } from "@effect-bun-starter/domain";
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

export const HealthLive = HttpApiBuilder.group(Api, "system", (handlers) =>
  handlers
    .handle("health", () =>
      Effect.succeed({
        service: "effect-bun-starter-api" as const,
        status: "ok" as const,
      }).pipe(
        Effect.tap(() => Effect.logInfo("system.health")),
        Effect.withSpan("system.health", {
          attributes: {
            "http.route": "/health",
          },
        })
      )
    )
    .handle("ping", () =>
      Effect.succeed({ message: "pong" as const }).pipe(
        Effect.tap(() => Effect.logInfo("system.ping")),
        Effect.withSpan("system.ping", {
          attributes: {
            "http.route": "/system/ping",
          },
        })
      )
    )
);
