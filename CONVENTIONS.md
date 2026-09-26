# Conventions

The rules this repo follows, one line each. The link says why; **Enforced** says what catches a break (a lint rule, a test, or review). Decisions live in [docs/adr/](docs/adr/). Add a rule here when it is adopted and retire it here when it is dropped.

## Code

| Rule | Why | Enforced |
| --- | --- | --- |
| Ponytail: build the minimum; mark each deliberate simplification with a `ponytail:` comment that names its ceiling. | [AGENTS.md](AGENTS.md#development-mode) | review |
| Branch with Effect matchers (`Match`, `Option.match`, `Boolean.match`), never `choose`/`when` helpers or ternaries. | [ADR 0014](docs/adr/0014-branch-with-effect-matchers.md) | `effect/noTernary` + review |
| Absence is `Option`, not `null`/`undefined`. | `oxlint-plugin-effect` recommended preset | `effect/noNullish` |
| Named effectful functions use `Effect.fn`; bare `Effect.gen` only for small local composition. | [ADR 0005](docs/adr/0005-prefer-effect-fn-for-effectful-functions.md) | review |
| Environment variables are read through `Config.*`; `process.env` only inside a `ConfigProvider` adapter. | [ADR 0008](docs/adr/0008-use-effect-config-for-env.md) | `effect/noGlobals` |
| Effect Schema is the schema system; JSON Schema only as the bridge to Zod. | [ADR 0003](docs/adr/0003-json-schema-as-schema-interop-bridge.md) | review |
| Public database ids are UUIDv7. | [ADR 0010](docs/adr/0010-use-uuidv7-for-public-ids.md) | review |
| Code workspaces typecheck source (`tsconfig.json`) and tests (`tsconfig.test.json`) with `tsc --noEmit`, after turbo builds the referenced packages. | [ADR 0009](docs/adr/0009-use-source-exports-with-project-references.md) | `bun run typecheck` |
| Entity ids cross the API as TypeIDs (`<prefix>_<base32>`) and stay `uuid` in PostgreSQL: define each with `TypeId(prefix, brand)` in `packages/domain/src/entity-ids.ts` and type its column with `$type<Brand>()`. | [ADR 0013](docs/adr/0013-typed-prefixed-ids.md) | review |
| Search boxes match with `matchesSearch` and order with `rankSearch` (`@effect-bun-starter/database`); identifiers such as emails use `containsSearch`; a searched column gets a GIN index on `public.search_text(column) gin_trgm_ops`. | [ADR 0017](docs/adr/0017-search-by-folded-trigram-similarity.md) | review |
| Signed-in endpoints use the `Authentication` middleware; a handler checks its action with `allow("<resource>.<action>")` against the role rules in `packages/domain/src/permissions.ts`; ownership filters stay in SQL. | [ADR 0012](docs/adr/0012-use-permix-effect-for-authorization.md) | review |
| A unique-constraint conflict becomes a typed 409 through `isUniqueViolation(error, "<constraint>")`, not a pre-check query. | `packages/database/src/database.ts` | review |
| Emails are react-email templates in `packages/email` rendered by a `render…Email` function and sent only through `Mailer`; their copy lives per locale in `copy.ts`. | `packages/email/src/mailer.ts` | review |
| Uploaded files go through `FileStorage` (bytes) and a `files` row (key); images go through `ImageProcessor` (WebP plus width copies) via `storeImage(bytes, widths, link)`, which removes the bytes on any failure or interruption until `link` (the statement linking the file, plus removing the bytes it replaced) succeeds; `link` runs uninterruptibly. A table links a file with a unique foreign key and a trigger that deletes the replaced file's row. | `apps/api/src/uploaded-image.ts` | `apps/api/test/uploaded-image.test.ts` |
| Logs and traces never carry a link credential: a logged URL goes through `redactAuthTokens`, and the API's span processor applies it to every string attribute before export. | `packages/auth/src/redact-auth-tokens.ts` | `packages/auth/test/redact-auth-tokens.test.ts` |

## Naming

| Rule | Why | Enforced |
| --- | --- | --- |
| Services are PascalCase nouns keyed `"<package name>/<Service>"`, the package name read from the nearest `package.json` (`"@effect-bun-starter/database/Database"`). | [ADR 0018](docs/adr/0018-name-effect-code-the-way-effect-does.md) | `anti-slop-effect/effect-naming` |
| A service's layers are static `layer` / `layer<Variant>` members (`Database.layer`, `Auth.layer`, `TestApp.layer`); any other Layer value or factory is camelCase ending in `Layer` (`appLayer`, `storesLayer`). No `XLive`. | [ADR 0018](docs/adr/0018-name-effect-code-the-way-effect-does.md) | `anti-slop-effect/effect-naming` |
| `make` builds a service's value; `layer…` provides it; `unsafe…` only for constructors that throw. | [ADR 0018](docs/adr/0018-name-effect-code-the-way-effect-does.md) | review |
| Internal errors are `Schema.TaggedError` classes ending in `Error`, tagged with the class name (`AuthConfigError`). | [ADR 0018](docs/adr/0018-name-effect-code-the-way-effect-does.md) | `anti-slop-effect/effect-naming` |
| HTTP API errors (in `packages/domain/src/api/`) are named for the outcome, with no suffix (`StoresUnavailable`), like Effect's `HttpApiError.NotFound`. | [ADR 0018](docs/adr/0018-name-effect-code-the-way-effect-does.md) | `anti-slop-effect/effect-naming` |
| Schemas are PascalCase domain nouns; wire shapes end in `Request` / `Response`. | [ADR 0018](docs/adr/0018-name-effect-code-the-way-effect-does.md) | review |
| Span names are `Effect.fn("<Module>.<operation>")`: PascalCase module, camelCase operation. | [ADR 0018](docs/adr/0018-name-effect-code-the-way-effect-does.md) | `anti-slop-effect/effect-naming` |
| Config keys are `UPPER_SNAKE`; a group of them is a camelCase `…Config` value. | [ADR 0008](docs/adr/0008-use-effect-config-for-env.md) | `anti-slop-effect/effect-naming` (keys) |
| Atoms are camelCase ending in `Atom`; keyed atoms use `Atom.family`. | [ADR 0018](docs/adr/0018-name-effect-code-the-way-effect-does.md) | `anti-slop-effect/effect-naming` |
| HttpApi groups and endpoints are camelCase ids. Handlers live in `apps/api/src/<audience>/<resource>/<resource>-handlers.ts`, the audience being `public`, `account` or `admin`; the group id is `<audience><Resource>` except for `public` (`stores`, `adminStores`, `accountAvatar`), and its handlers are `<group>Layer`. | [ADR 0018](docs/adr/0018-name-effect-code-the-way-effect-does.md) | `anti-slop-effect/effect-naming` (suffix) + review |
| Files are kebab-case and named for what they hold: a service's file is its name (`database.ts`), contracts end in `-contract.ts`, barrels are only `index.ts`, tests are `<feature>.test.ts`. TanStack route files follow the router's scheme. | [ADR 0018](docs/adr/0018-name-effect-code-the-way-effect-does.md) | `anti-slop-effect/effect-naming` (case, `-live`) + review |
| Tests: `it.effect("verb-led sentence")`; test layers follow the Layer rule (`testLayer`, `layerTest`). | [ADR 0018](docs/adr/0018-name-effect-code-the-way-effect-does.md) | review |

## Web

| Rule | Why | Enforced |
| --- | --- | --- |
| Astryx components come first; the `modern-web-guidance` skill covers what Astryx leaves open. | [AGENTS.md](AGENTS.md#web-work) | review |
| Public pages render on the server and never load a signed-in account's private data; signed-in areas may render and cache in the browser. | [ADR 0016](docs/adr/0016-render-by-audience.md) | review |
| A public page reads its data in the route loader through a server function and `server-api.ts` (cookie forwarded); its forms that only read, like search, are GET forms that work before hydration. | [ADR 0016](docs/adr/0016-render-by-audience.md) | review |
| A signed-in page sets `ssr: false`, `pendingComponent: PendingPage` and a loader that calls `signedInOrSignIn`, which sends signed-out visitors to sign-in with `?redirect=`. Its data comes from `ApiClient` atoms; atom queries never run in a server-rendered component, since the server shares one atom registry across requests. | [ADR 0016](docs/adr/0016-render-by-audience.md) | review |
| Pages for one signed-in account or for signing in set `staticData: { isPrivate: true }`: noindex, no canonical or hreflang. | [ADR 0016](docs/adr/0016-render-by-audience.md) | review |
| Role-gated screens read the role from the session (`GET /admin/session`, read with it on the server); the API checks every action again. | [ADR 0012](docs/adr/0012-use-permix-effect-for-authorization.md) | review |
| Style with the first step that fits: token → component prop → custom variant → `xstyle` with `stylex.create` and token vars; no inline `style` or own `className` stylesheets. | [ADR 0015](docs/adr/0015-style-through-the-astryx-ladder.md) | review |
| Sizes are tokens or rem (`maxWidth="40rem"`, `--spacing-*`, `--font-size-*`), never raw px; where an Astryx prop only takes px, `xstyle` carries the rem value. | [ADR 0015](docs/adr/0015-style-through-the-astryx-ladder.md) | review |
| Pages live under `/$locale` and read the typed `locale` from the route context; every string comes from `i18n.ts` (app) or `astryx-messages.ts` (Astryx), with en and fr added together. | `apps/web/src/i18n.ts` | `satisfies Record<Locale, Messages>` (typecheck) |
| Forms use TanStack Form with the Effect Schema as validator (`schemaValidator`): errors after blur or submit, focus to the first invalid field. An API refusal about one field (409, 404) is returned from `onSubmit` with `createValidationError` and shown on that field. | [ADR 0011](docs/adr/0011-use-tanstack-form.md) | review |
| After an action, focus goes to what replaced the control: the field in error, else the outcome banner or heading (`focusOnMount`). | `apps/web/src/components/split-screen.tsx` | review |
| A `?redirect=` target is decoded with `SitePath` and sent through `encodedSitePath`. | `apps/web/src/lib/site-path.ts` | `apps/web/test/site-path.test.ts` |
| Server functions reach the API through `server-api.ts` (cookie forwarded) and are CSRF-checked by `createCsrfMiddleware`. | `apps/web/src/start.ts` | review |
| Better Auth refusals are shown through `authFailureMessage`, never the API's English message; typed API errors map to copy by `_tag`. | `apps/web/src/lib/auth-client.ts` | `apps/web/test/auth-client.test.ts` |

## Work

| Rule | Why | Enforced |
| --- | --- | --- |
| Uncommitted work (probes, drafts, screenshots, hand-offs) goes in `.scratchpad/<task>/`. | [AGENTS.md](AGENTS.md#scratch-work) | `.gitignore` |
| `apps/api` tests run on Bun (`bun --bun … vitest run`), the runtime the API ships on; other packages' tests run on Node. | `apps/api/package.json` | `bun run test` |
