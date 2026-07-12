# Use Drizzle Effect Postgres for Persistence

Effect Bun Starter will use Drizzle's Effect PostgreSQL integration for database access when persistence work begins. This keeps SQL schema and query code in Drizzle while allowing database access to compose through Effect layers and `@effect/sql-pg`; no Drizzle dependencies or database wiring are added until the backend actually needs persistence.
