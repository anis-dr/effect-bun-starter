import { Auth, authRoutesLayer } from "@effect-bun-starter/auth";
import { Api } from "@effect-bun-starter/domain";
import { Layer } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { storesLayer } from "./public/stores/stores-handlers.js";
import { systemLayer } from "./public/system/system-handlers.js";

export const apiLayer = HttpApiBuilder.layer(Api).pipe(
  Layer.provide(systemLayer),
  Layer.provide(storesLayer)
);

export const appLayer = Layer.merge(apiLayer, authRoutesLayer).pipe(
  Layer.provideMerge(Auth.layer)
);
