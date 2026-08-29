import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/node-postgres";

import { account, session, user, verification } from "./schema/auth-schema.js";

const schema = { account, session, user, verification };
const db = drizzle.mock();

export const auth = betterAuth({
  // ponytail: CLI-only placeholders. Better Auth needs an auth instance to
  // generate schema, but these values are not used by the running API.
  baseURL: "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: "schema-generation-secret-at-least-32-chars",
});
