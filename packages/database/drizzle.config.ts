import { defineConfig } from "drizzle-kit";
import { Config, Effect, Redacted } from "effect";

const databaseUrl = Effect.runSync(
  Config.redacted("DATABASE_URL").pipe(Effect.map(Redacted.value))
);

export default defineConfig({
  dbCredentials: {
    url: databaseUrl,
  },
  dialect: "postgresql",
  out: "./drizzle",
  schema: ["./src/schema/index.ts", "../auth/src/schema/auth-schema.ts"],
});
