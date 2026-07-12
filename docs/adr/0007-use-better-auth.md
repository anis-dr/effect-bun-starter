# Use Better Auth for Authentication

Effect Bun Starter will use Better Auth for authentication and session management. Better Auth provides the auth model and HTTP handlers, while Effect integration can be handled with a thin adapter such as `@effectify/node-better-auth` or equivalent local glue when auth work starts; no auth dependency or schema is added until the backend needs authentication.
