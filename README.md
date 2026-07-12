# Effect Bun Starter

A full-stack TypeScript monorepo starter built around Bun and Effect v4. It includes a typed HTTP API, TanStack Start web app, PostgreSQL persistence, Better Auth, OpenTelemetry, shared UI and domain packages, and repository-wide verification through Turborepo.

The repository is a GitHub template: create a new project from it, rename the starter identifiers, and replace the included Store flow with your first domain feature.

## Use this template

Create a repository in GitHub with [Use this template](https://github.com/new?template_name=effect-bun-starter&template_owner=anis-dr), or use the GitHub CLI:

```bash
gh repo create my-app \
  --template anis-dr/effect-bun-starter \
  --private \
  --clone
cd my-app
```

## Prerequisites

- [Bun](https://bun.sh/) 1.3.14 or a compatible release
- [Docker](https://docs.docker.com/get-docker/) with Docker Compose

## Quick start

```bash
cp .env.example .env
bun install --frozen-lockfile
bun run db:up
bun --filter @effect-bun-starter/database db:migrate
bun run dev
```

Before starting the apps, replace the `BETTER_AUTH_SECRET` placeholder in `.env` with a cryptographically random value containing at least 32 characters.

Local services:

| Service    | URL                          |
| ---------- | ---------------------------- |
| Web        | http://localhost:3000        |
| API        | http://localhost:3002        |
| API health | http://localhost:3002/health |
| PostgreSQL | `localhost:5437`             |

`bun run dev` starts the API and web workspaces through Turborepo. Stop them with `Ctrl+C`. Stop the database separately with `docker compose down`.

## Included stack

- [Bun](https://bun.sh/) for package management and the API runtime
- [Effect v4](https://effect.website/) for typed effects, configuration, layers, schemas, HTTP contracts, and testing
- [Turborepo](https://turbo.build/repo) for workspace task orchestration
- [TanStack Start](https://tanstack.com/start) and React 19 for the web application
- [Better Auth](https://www.better-auth.com/) with an Effect-backed Drizzle adapter
- [Drizzle ORM](https://orm.drizzle.team/) and PostgreSQL 18 for persistence
- [OpenTelemetry](https://opentelemetry.io/) for API, server, and browser traces and logs
- TypeScript 7 with [`@effect/tsgo`](https://www.npmjs.com/package/@effect/tsgo)
- [Vitest](https://vitest.dev/) and `@effect/vitest` for tests
- Tailwind CSS 4 and a shared React UI package
- OXC-based formatting and linting through Oxfmt and Ultracite
- Nitro for the production web server output

Some core dependencies currently use beta or release-candidate versions, including Effect v4, Drizzle ORM, and Nitro. Upgrade them deliberately and run every verification command after dependency changes.

## Workspace layout

```text
apps/
├── api/                 Bun HTTP API, auth routes, telemetry, handlers
└── web/                 TanStack Start application and telemetry proxy
packages/
├── auth/                Better Auth configuration and Effect adapter
├── database/            PostgreSQL layer, Drizzle schema, migrations
├── domain/              Shared Effect Schema and HttpApi contracts
├── typescript-config/   Shared TypeScript project configurations
└── ui/                  Shared React components and styles
```

The included Store schema, endpoint, and UI are intentionally small. They demonstrate the database → domain contract → API handler → web client path and can be replaced with your first domain feature.

## Commands

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start all development tasks |
| `bun run db:up` | Start the local PostgreSQL container and wait for health |
| `bun --filter @effect-bun-starter/database db:migrate` | Apply committed Drizzle migrations |
| `bun --filter @effect-bun-starter/database db:generate` | Generate a migration after schema changes |
| `bun --filter @effect-bun-starter/database db:studio` | Open Drizzle Studio |
| `bun run typecheck` | Typecheck source and tests across workspaces |
| `bun run test` | Run all workspace tests |
| `bun run lint` | Check lint rules and formatting through Ultracite |
| `bun run format` | Check formatting through Oxfmt |
| `bun run build` | Build the API and web applications |
| `bun run lint:fix` | Apply supported lint fixes |
| `bun run format:fix` | Format the repository |

## Configuration

Start with `.env.example`:

| Variable | Required | Default or example | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | `postgres://postgres:postgres@localhost:5437/effect_bun_starter` | PostgreSQL connection used by the API, migrations, and database tests |
| `BETTER_AUTH_SECRET` | Yes | Replace the example value | Better Auth signing secret; minimum 32 characters |
| `BETTER_AUTH_URL` | Yes | `http://localhost:3000` | Public application URL used by Better Auth |
| `PORT` | No | `3002` | API listen port |
| `VITE_API_URL` | No | `http://localhost:3002` | API base URL used by the web client |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | `http://127.0.0.1:27686` | OTLP HTTP collector base URL for server traces and logs |
| `VITE_OTEL_EXPORTER_OTLP_TRACES_URL` | No | `/api/otel/v1/traces` | Browser trace export URL |

The local web origin is allowed by the API CORS configuration. Configure deployed origins before exposing the API publicly.

## Customize the starter

Rename these identifiers before building product features:

- Root name: `effect-bun-starter`
- Workspace scope: `@effect-bun-starter/*`
- Database name: `effect_bun_starter`
- Service names beginning with `effect-bun-starter-`

Find remaining occurrences with:

```bash
git grep -n -i -E 'effect-bun-starter|effect_bun_starter'
```

Update package names, imports, TypeScript configuration references, telemetry service names, Docker configuration, environment examples, and the lockfile together. Then run `bun install` to regenerate workspace metadata and execute the full verification suite.

Delete or replace the example Store flow only after its replacement covers the same database, contract, API, and web boundaries you need.

## Verify the project

Run the full gate before starting product work and before every deployment:

```bash
bun install --frozen-lockfile
bun run typecheck
bun run test
bun run lint
bun run format
bun run build
```

Database and auth tests require the configured PostgreSQL instance. Start it with `bun run db:up` first.

## Production builds

Build every workspace:

```bash
bun run build
```

Run the bundled API with Bun:

```bash
bun --env-file=.env apps/api/dist/main.js
```

Run the Nitro web server with Node:

```bash
node apps/web/.output/server/index.mjs
```

The web output under `apps/web/.output/` is a self-contained Nitro server. Configure production secrets, database connectivity, CORS origins, and the OTLP endpoint in the deployment environment rather than committing an `.env` file.

For host-specific Nitro deployment presets, see the [Nitro deployment documentation](https://v3.nitro.build/deploy).

## Architecture decisions

Reusable technical decisions live in [`docs/adr`](docs/adr). They explain the Effect HTTP contract, schema interoperability, Drizzle/PostgreSQL integration, Effect configuration, TypeScript project references, authentication, linting, and identifier choices.
