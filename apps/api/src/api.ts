import { Auth, authRoutesLayer } from "@effect-bun-starter/auth";
import { Api } from "@effect-bun-starter/domain";
import { Layer } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { adminAdminsLayer } from "./admin/admins/admins-handlers.js";
import { adminSessionLayer } from "./admin/session/session-handlers.js";
import { adminStoresLayer } from "./admin/stores/stores-handlers.js";
import { authenticationLayer } from "./authentication-middleware.js";
import { storesLayer } from "./public/stores/stores-handlers.js";
import { systemLayer } from "./public/system/system-handlers.js";

export const apiLayer = HttpApiBuilder.layer(Api).pipe(
  Layer.provide(systemLayer),
  Layer.provide(storesLayer),
  Layer.provide(adminStoresLayer),
  Layer.provide(adminSessionLayer),
  Layer.provide(adminAdminsLayer),
  Layer.provide(authenticationLayer)
);

export const appLayer = Layer.merge(apiLayer, authRoutesLayer).pipe(
  Layer.provideMerge(Auth.layer)
);
