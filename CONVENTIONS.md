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
| HttpApi groups and endpoints are camelCase ids; a group's handlers are `<group>Layer` in `<area>/<group>-handlers.ts` (`public/stores/stores-handlers.ts`). | [ADR 0018](docs/adr/0018-name-effect-code-the-way-effect-does.md) | `anti-slop-effect/effect-naming` (suffix) |
| Files are kebab-case and named for what they hold: a service's file is its name (`database.ts`), contracts end in `-contract.ts`, barrels are only `index.ts`, tests are `<feature>.test.ts`. TanStack route files follow the router's scheme. | [ADR 0018](docs/adr/0018-name-effect-code-the-way-effect-does.md) | `anti-slop-effect/effect-naming` (case, `-live`) + review |
| Tests: `it.effect("verb-led sentence")`; test layers follow the Layer rule (`testLayer`, `layerTest`). | [ADR 0018](docs/adr/0018-name-effect-code-the-way-effect-does.md) | review |

## Web

| Rule | Why | Enforced |
| --- | --- | --- |
| Astryx components come first; the `modern-web-guidance` skill covers what Astryx leaves open. | [AGENTS.md](AGENTS.md#web-work) | review |
| Public pages render on the server and never load a signed-in account's private data; signed-in areas may render and cache in the browser. | [ADR 0016](docs/adr/0016-render-by-audience.md) | review |

## Work

| Rule | Why | Enforced |
| --- | --- | --- |
| Uncommitted work (probes, drafts, screenshots, hand-offs) goes in `.scratchpad/<task>/`. | [AGENTS.md](AGENTS.md#scratch-work) | `.gitignore` |
