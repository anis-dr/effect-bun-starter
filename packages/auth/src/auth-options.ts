import type { DatabaseClient } from "@effect-bun-starter/database";
import type { BetterAuthOptions } from "better-auth";
import type { Context } from "effect";

import type { EffectDrizzleAdapterConfig } from "./auth-adapter.js";
import { effectDrizzleAdapter } from "./auth-adapter.js";

export interface AuthConfig {
  readonly baseURL: string;
  readonly secret: string;
}

export const makeAuthOptions = (
  db: DatabaseClient,
  config: AuthConfig,
  context: Context.Context<never>,
  adapterConfig: Pick<EffectDrizzleAdapterConfig, "schema"> = {}
) =>
  ({
    baseURL: config.baseURL,
    database: effectDrizzleAdapter(
      db,
      {
        provider: "pg",
        transaction: true,
        ...adapterConfig,
      },
      context
    ),
    emailAndPassword: {
      enabled: true,
    },
    secret: config.secret,
  }) satisfies BetterAuthOptions;
