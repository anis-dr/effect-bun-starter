import { Database } from "@effect-bun-starter/database";
import { betterAuth } from "better-auth";
import { Effect, Layer } from "effect";

import { loadAuthConfig } from "./auth-config.js";
import { makeAuthOptions } from "./auth-options.js";
import { makeAuthRoutes } from "./auth-routes.js";
import * as authSchema from "./schema/auth-schema.js";

const makeAuth = Effect.gen(function* makeAuth() {
  const config = yield* loadAuthConfig;
  const db = yield* Database;
  const context = yield* Effect.context<never>();

  return betterAuth(
    makeAuthOptions(db, config, context, { schema: authSchema })
  );
});

export const AuthRoutesLive = Layer.unwrap(
  makeAuth.pipe(Effect.map((auth) => makeAuthRoutes(auth.handler)))
);
