import type { DatabaseClient } from "@effect-bun-starter/database";
import { betterAuth } from "better-auth";
import { Context } from "effect";

import { makeAuthOptions } from "./auth-options.js";

const db = { _: {} } as unknown as DatabaseClient;

export const auth = betterAuth(
  makeAuthOptions(
    db,
    {
      // ponytail: CLI-only placeholders. Better Auth needs an auth instance to
      // generate schema, but these values are not used by the running API.
      baseURL: "http://localhost:3000",
      secret: "schema-generation-secret-at-least-32-chars",
    },
    Context.empty()
  )
);
