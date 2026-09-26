# Effect Bun Starter

A full-stack TypeScript monorepo starter built around Bun and Effect v4. It includes a typed HTTP API, TanStack Start web app, PostgreSQL persistence, Better Auth, OpenTelemetry, shared UI and domain packages, and repository-wide verification through Turborepo.

The repository is a GitHub template: create a new project from it, rename the starter identifiers, and replace the example resource (stores) with your first domain feature. Accounts, roles, email, uploads, search, languages and theming are already wired, so a new project starts on its own features.

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

- [Bun](https://bun.sh/) 1.4.2 or a compatible release
- [Docker](https://docs.docker.com/get-docker/) with Docker Compose

## Quick start

```bash
cp .env.example .env
bun install --frozen-lockfile
bun run db:up
bun run mail:up
bun --filter @effect-bun-starter/database db:migrate
bun run dev
```

Before starting the apps:

1. Replace the `BETTER_AUTH_SECRET` placeholder in `.env` with a cryptographically random value containing at least 32 characters.
2. Set `SUPERADMIN_EMAIL` to your own email, then create an account with it at http://localhost:3000/en/sign-in?mode=signUp. That account opens the admin area and appoints other admins.

Password-reset and other account email goes to the local Mailpit inbox at http://localhost:8025. Preview and edit the email templates with `bun run email:dev` (http://localhost:3005).

If your database volume predates the switch to the glibc `postgres:18` image (an older Alpine volume), recreate it once so it is initialized with a UTF-8 locale, which accent-insensitive search needs: `docker compose down -v` (this deletes the local data), then `bun run db:up` and migrate again.

Local services:

| Service    | URL                          |
| ---------- | ---------------------------- |
| Web        | http://localhost:3000        |
| API        | http://localhost:3002        |
| API health | http://localhost:3002/health |
| PostgreSQL | `localhost:5437`             |
| Mailpit    | http://localhost:8025        |

`bun run dev` starts the API and web workspaces through Turborepo. Stop them with `Ctrl+C`. Stop the database and Mailpit separately with `docker compose down`.

## What's included

- **Example resource:** stores, from table to page. The home page lists and searches them on the server; admins create them in the admin area.
- **Accounts:** sign in, create an account, forgot and reset password on [Better Auth](https://www.better-auth.com/); the header shows the signed-in account, read on the server, with its avatar. An account page uploads or removes the avatar and signs out.
- **Roles:** `member`, `admin` and `superadmin` (the account whose email is `SUPERADMIN_EMAIL`), checked with [Permix](https://permix.letstri.dev/) on every API action ([ADR 0012](docs/adr/0012-use-permix-effect-for-authorization.md)). The admin area creates stores; the superadmin also appoints and removes admins; members get an access-denied page.
- **Email:** `packages/email` with a `Mailer` (Resend in production, SMTP to Mailpit locally) and a password-reset email in the language of the page it was requested from.
- **Uploads:** `FileStorage` (local disk, served at `/uploads`) with a `files` table, and WebP image processing with Bun.Image for avatars.
- **Search:** typo- and accent-tolerant search with `pg_trgm` and `unaccent` (`GET /stores?q=`, [ADR 0017](docs/adr/0017-search-by-folded-trigram-similarity.md)).
- **Typed IDs:** entity ids cross the API as prefixed TypeIDs (`store_…`) over UUIDv7 ([ADR 0013](docs/adr/0013-typed-prefixed-ids.md)).
- **Rendering:** public pages render on the server with their data from the route loader; signed-in areas render in the browser ([ADR 0016](docs/adr/0016-render-by-audience.md)).
- **Languages:** `/en` and `/fr` routes; `/` negotiates from the `locale` cookie, then Accept-Language; a language menu, `<html lang dir>`, hreflang and canonical links, and Astryx's own strings translated.
- **Styling:** Astryx 0.6.3 with its neutral theme and the StyleX compiler for `xstyle`; the styling ladder and rem sizing are in [ADR 0015](docs/adr/0015-style-through-the-astryx-ladder.md). Two Astryx patches live in `patches/`.
- **Theme:** light, dark or system, stored in a cookie and rendered on the server, so reloads don't flash.
- **Forms:** TanStack Form with Effect Schema validation, errors after blur or submit, API refusals shown on their field, and focus moved to what needs attention.
- **Security:** server functions forward the session cookie to the API and reject cross-site calls (`createCsrfMiddleware`); `?redirect=` targets must stay on the site.
- **Editor:** `.zed/settings.json` runs tsgo as the primary language server and vtsls for refactors.

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
- [Astryx](https://github.com/facebook/astryx) with its neutral theme for accessible React UI
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
├── database/            PostgreSQL layer, Drizzle schema, migrations, search helpers
├── domain/              Shared Effect Schema and HttpApi contracts, typed IDs, permissions
├── email/               Mailer and react-email templates
└── typescript-config/   Shared TypeScript project configurations
```

API handlers are grouped by audience under `apps/api/src/`: `public/`, `account/` and `admin/`.

The example resource (stores) is intentionally small. It demonstrates the database → domain contract → API handler → web page path, for a public page and for the admin area, and can be replaced with your first domain feature.

## Commands

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start all development tasks |
| `bun run db:up` | Start the local PostgreSQL container and wait for health |
| `bun run mail:up` | Start Mailpit, the local SMTP server and inbox |
| `bun run email:dev` | Preview the email templates on port 3005 |
| `bun --filter @effect-bun-starter/database db:migrate` | Apply committed Drizzle migrations |
| `bun --filter @effect-bun-starter/database db:generate` | Generate a migration after schema changes |
| `bun --filter @effect-bun-starter/database db:studio` | Open Drizzle Studio |
| `bun run typecheck` | Typecheck source and tests across workspaces |
| `bun run test` | Run all workspace tests |
| `bun run lint` | Check type-aware lint rules and formatting through Ultracite |
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
| `BETTER_AUTH_URL` | Yes | `http://localhost:3002` | API URL that serves the Better Auth routes |
| `BETTER_AUTH_TRUSTED_ORIGIN` | No | `http://localhost:3000` | Web origin trusted by Better Auth and the only origin API CORS allows |
| `BETTER_AUTH_COOKIE_DOMAIN` | With sibling subdomains | Commented out | Parent domain the API and web hosts share (`example.com`); the session cookie is set on it. See [Deployment topology](#deployment-topology) |
| `PORT` | No | `3002` | API listen port |
| `VITE_API_URL` | No | `http://localhost:3002` | API base URL used by the web client |
| `SUPERADMIN_EMAIL` | No | `owner@example.com` (commented out) | The one account that appoints and removes admins; unset, there is no superadmin |
| `MAIL_TRANSPORT` | No | `smtp` | `smtp` sends through `SMTP_URL`; `resend` sends through Resend |
| `SMTP_URL` | With `smtp` | `smtp://localhost:1025` | SMTP server; Mailpit locally |
| `RESEND_API_KEY` | With `resend` | Commented out | Resend API key for production email |
| `EMAIL_FROM` | Yes | `App <no-reply@example.com>` | Sender of every email; with Resend, on a verified domain |
| `APP_NAME` | No | `App` | Product name the emails show |
| `UPLOADS_DIR` | No | `uploads` | Directory for uploaded files, relative to the API's working directory |
| `UPLOADS_URL` | No | `http://localhost:3002/uploads` | Public base URL of uploaded files |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | `http://127.0.0.1:27686` | OTLP HTTP collector base URL for server traces and logs |
| `OTEL_DEPLOYMENT_ENVIRONMENT` | No | `development` | Deployment environment recorded on server telemetry |
| `OTEL_SERVICE_VERSION` | No | `0.0.0` | Service version recorded on server telemetry |
| `VITE_OTEL_EXPORTER_OTLP_TRACES_URL` | No | `/api/otel/v1/traces` | Browser trace export URL |
| `VITE_OTEL_DEPLOYMENT_ENVIRONMENT` | No | `development` | Deployment environment recorded on browser traces |
| `VITE_OTEL_SERVICE_VERSION` | No | `0.0.0` | Service version recorded on browser traces |

API CORS allows `BETTER_AUTH_TRUSTED_ORIGIN`, with credentials so browser sessions reach the API. Set it to the deployed web origin before exposing the API publicly. The API does not start without `EMAIL_FROM`, nor without `SMTP_URL` when the transport is `smtp`.

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

Replace the Effect Bun Starter name in `apps/web/src/i18n.ts` (`appName`) and set `APP_NAME` for the emails. Add a language by adding it to `locales`, `localeNames` and `messages` in `i18n.ts`, and to `astryx-messages.ts`.

Delete or replace the example resource only after its replacement covers the same database, contract, API, and web boundaries you need.

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

API, database, and auth tests require the configured PostgreSQL instance, migrated. Start it with `bun run db:up` first.

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

The web output under `apps/web/.output/` is a self-contained Nitro server. Configure production secrets, database connectivity, CORS origins, email, the uploads directory and URL, and the OTLP endpoint in the deployment environment rather than committing an `.env` file.

For host-specific Nitro deployment presets, see the [Nitro deployment documentation](https://v3.nitro.build/deploy).

### Deployment topology

The browser signs in against the API directly, and the web server renders signed-in pages by forwarding the browser's cookies to the API. The session cookie must therefore reach both hosts:

- **Same host, different ports** (development, `localhost:3000` and `localhost:3002`): cookies ignore ports, so this works with no setting.
- **Sibling subdomains** (production, `app.example.com` and `api.example.com`): set `BETTER_AUTH_COOKIE_DOMAIN=example.com`. The API then sets the session cookie on `example.com`, and the web server receives it. The API refuses to start when the domain is not both hosts' parent.
- **Unrelated domains** are not supported: the web server would never see the session.

## Conventions

[`CONVENTIONS.md`](CONVENTIONS.md) lists every rule the repository follows (code, naming, web, work), one line each, with the reason and what enforces it: a lint rule, a test, or review. Agent instructions live in [`AGENTS.md`](AGENTS.md).

## Architecture decisions

Reusable technical decisions live in [`docs/adr`](docs/adr):

| ADR | Decision |
| --- | --- |
| [0001](docs/adr/0001-effect-rpc-and-http-transports.md) | Typed HTTP API contracts; RPC only for controlled transports |
| [0003](docs/adr/0003-json-schema-as-schema-interop-bridge.md) | Effect Schema first; JSON Schema as the interop bridge |
| [0004](docs/adr/0004-use-drizzle-effect-postgres.md) | Drizzle over Effect PostgreSQL |
| [0005](docs/adr/0005-prefer-effect-fn-for-effectful-functions.md) | `Effect.fn` for named effectful functions |
| [0006](docs/adr/0006-use-oxc-for-linting.md) | OXC for linting |
| [0007](docs/adr/0007-use-better-auth.md) | Better Auth for authentication |
| [0008](docs/adr/0008-use-effect-config-for-env.md) | Effect `Config` for environment variables |
| [0009](docs/adr/0009-use-source-exports-with-project-references.md) | Source exports with declaration-only project references |
| [0010](docs/adr/0010-use-uuidv7-for-public-ids.md) | UUIDv7 for public database ids |
| [0011](docs/adr/0011-use-tanstack-form.md) | TanStack Form for forms |
| [0012](docs/adr/0012-use-permix-effect-for-authorization.md) | Permix for authorization, patched for Effect v4 |
| [0013](docs/adr/0013-typed-prefixed-ids.md) | Typed, prefixed IDs at the API edge |
| [0014](docs/adr/0014-branch-with-effect-matchers.md) | Branch with Effect matchers |
| [0015](docs/adr/0015-style-through-the-astryx-ladder.md) | Style through the Astryx ladder; size in rem and tokens |
| [0016](docs/adr/0016-render-by-audience.md) | Public pages render on the server; signed-in areas may render in the browser |
| [0017](docs/adr/0017-search-by-folded-trigram-similarity.md) | Search by folded trigram similarity in PostgreSQL |
| [0018](docs/adr/0018-name-effect-code-the-way-effect-does.md) | Name Effect code the way Effect does |
