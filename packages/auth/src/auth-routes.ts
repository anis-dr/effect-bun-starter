import { Effect, Layer } from "effect";
import { HttpEffect, HttpRouter } from "effect/unstable/http";

import { Auth } from "./auth.js";

export const AuthRoutesLive = Layer.unwrap(
  Auth.pipe(
    Effect.map(({ handler }) =>
      HttpRouter.add("*", "/api/auth/*", HttpEffect.fromWebHandler(handler))
    )
  )
);
