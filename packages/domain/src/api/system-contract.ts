import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

export const HealthResponse = Schema.Struct({
  service: Schema.Literal("effect-bun-starter-api"),
  status: Schema.Literal("ok"),
});

export const PingResponse = Schema.Struct({
  message: Schema.Literal("pong"),
});

export const Group = HttpApiGroup.make("system")
  .add(
    HttpApiEndpoint.get("health", "/health", {
      success: HealthResponse,
    })
  )
  .add(
    HttpApiEndpoint.post("ping", "/system/ping", {
      success: PingResponse,
    })
  );
