import { DomainApi } from "@effect-bun-starter/domain";
import { Layer } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { StoresLive } from "./public/stores/stores-live.js";
import { HealthLive } from "./public/system/health-live.js";

export const ApiLive = HttpApiBuilder.layer(DomainApi).pipe(
  Layer.provide(HealthLive),
  Layer.provide(StoresLive)
);
