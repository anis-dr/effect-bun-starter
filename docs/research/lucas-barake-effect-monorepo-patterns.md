# Lucas Barake Effect Monorepo Patterns

Source: `https://github.com/lucas-barake/effect-monorepo`

Local scan path: `/var/folders/fw/kj9kfzq97mn9qhxn0xp1p9cc0000gn/T/opencode/effect-monorepo-lucas-barake`

Purpose: extract the repository rules and ADR candidates that Effect Bun Starter can adopt without copying unnecessary framework code.

## Executive Read

The most important pattern is not RPC. It is a shared typed contract package.

The reference repo puts schemas, endpoint contracts, errors, auth middleware contracts, policy primitives, and event types in `packages/domain`. The server imports those contracts to implement handlers. The React client imports the same contracts to build a type-safe HTTP client. This gives Effect guarantees over normal HTTP: typed request shapes, typed response shapes, typed expected errors, middleware requirements, schema decoding, retries, tracing, and centralized runtime execution.

RPC exists too, but it is used for a different seam: browser worker communication. The repo uses RPC where request/response transport is internal and fully controlled. It uses `HttpApi` for network client/server contracts. For Effect Bun Starter, typed HTTP is enough for the app/API surface unless a separate controlled transport appears.

## Effect Version Caveat

The reference repo uses Effect v3 and split packages:

- `effect@3.14.16`
- `@effect/platform`
- `@effect/rpc`
- `@effect/platform-node`
- `@effect/platform-browser`

Effect Bun Starter uses Effect v4 beta. Copy the architecture and rules, not syntax.

Translation rules:

- Use Effect Bun Starter's v4 import style, for example `effect/unstable/http`, `effect/unstable/httpapi`, and `effect/unstable/rpc` where applicable.
- Replace `Effect.Service` and `Effect.Tag` service classes with v4 `ServiceMap.Service` plus explicit layers.
- Replace `Schema.TaggedError<T>()(...)` with `Schema.TaggedErrorClass(...)`.
- Prefer named `Effect.fn("Name")`; the reference repo often uses `Effect.fnUntraced`.
- Do not copy `@effect/build-utils prepare-v2` package build setup unless Effect Bun Starter deliberately adopts Effect's package publishing template.

## Package Boundary Rules

The repo has four packages:

- `packages/domain`: shared contracts and domain rules.
- `packages/server`: server implementations and runtime composition.
- `packages/client`: React app, typed HTTP client, browser runtime, worker RPC.
- `packages/database`: Drizzle schema, migrations, database adapter.

Dependency direction:

- `domain` depends only on Effect/platform packages.
- `database` owns database schema and adapter code.
- `server` depends on `domain` and `database`.
- `client` depends on `domain`, not `server` or `database`.

Effect Bun Starter rule:

- Keep wire/domain contracts in a shared domain package.
- Let server implement shared contracts.
- Let client consume shared contracts.
- Do not let app packages import each other laterally.
- Enforce seams with tooling only after violations appear.

Reference files:

- `README.md:3-8`
- `packages/domain/package.json:26-29`
- `packages/server/package.json:26-41`
- `packages/client/package.json:21-49`
- `packages/database/package.json:31-37`
- `tsconfig.base.json:39-48`

## Shared Domain Contract Rules

The domain package owns the interface that client and server share.

What belongs in domain:

- Branded IDs.
- Request payload schemas.
- Response schemas.
- Expected HTTP errors with status annotations.
- HTTP API groups and endpoints.
- Auth middleware contracts.
- Current user context shape.
- Policy combinators.
- SSE/event schemas.

What does not belong in domain:

- Database clients.
- Server handler implementations.
- React hooks.
- UI state.
- Better Auth internals.
- Bun or Node server boot code.

Reference files:

- `packages/domain/src/DomainApi.ts:5-7`
- `packages/domain/src/EntityIds.ts:3-7`
- `packages/domain/src/api/TodosContract.ts:8-53`
- `packages/domain/src/api/SseContract.ts:8-36`
- `packages/domain/src/api/Contracts.ts:1-2`

## Type-Safe HTTP Pattern

The repo uses Effect `HttpApi` as the source of truth for HTTP. This is the key pattern for Effect Bun Starter's external HTTP and React client needs.

Domain defines the contract:

```ts
export class DomainApi extends HttpApi.make("domain")
  .add(TodosContract.Group)
  .add(SseContract.Group) {}
```

Server composes the domain API into its server API:

```ts
export const Api = HttpApi.make("api").addHttpApi(DomainApi);
```

Server implements groups, not raw routes:

```ts
export const TodosLive = HttpApiBuilder.group(
  Api,
  "todos",
  Effect.fnUntraced(function* (handlers) {
    const repository = yield* TodosRepository;
    return handlers.handle("get", () => repository.findAll());
  })
);
```

Client builds a typed client from the same domain API:

```ts
const clientEffect = HttpApiClient.make(DomainApi, {
  baseUrl: envVars.API_URL.toString(),
  transformClient: (client) =>
    client.pipe(HttpClient.retryTransient({ times: 3 })),
});
```

Effect Bun Starter rule:

- Use typed `HttpApi` for external HTTP and React client/server communication.
- Treat typed `HttpApi` as the default source of end-to-end type safety.
- Avoid hand-written fetch wrappers for normal endpoints.
- Use shared schemas and expected errors to get Effect guarantees over HTTP.
- Add a raw client only for endpoints that require transport details, such as SSE streams.

Reference files:

- `packages/domain/src/DomainApi.ts:1-7`
- `packages/server/src/api.ts:1-4`
- `packages/server/src/public/todos/todos-live.ts:9-53`
- `packages/server/src/server.ts:26-29`
- `packages/client/src/services/common/api-client.ts:9-24`

## Raw HTTP Client Exception

The reference repo includes a custom `unsafe-http-api-client.ts`. It reflects the `HttpApi` contract and returns raw `HttpClientResponse` values. It exists because SSE needs access to `response.stream`.

Effect Bun Starter rule:

- Do not start with a custom unsafe client.
- Use Effect's typed HTTP API client for ordinary JSON endpoints.
- Build a raw/reflected client only when a concrete endpoint needs raw response access.
- Keep raw clients quarantined behind a named service.

Reference files:

- `packages/client/src/services/common/unsafe-http-api-client.ts:99-167`
- `packages/client/src/services/common/unsafe-http-api-client.ts:228-301`
- `packages/client/src/services/common/unsafe-http-api-client.ts:304-336`
- `packages/client/src/services/data-access/sse-queries.tsx:25-38`

## RPC Pattern

The reference repo uses RPC for browser worker communication, not for its HTTP API surface.

RPC contract:

```ts
export class WorkerRpc extends RpcGroup.make(
  Rpc.make("filterData", { payload, success, error }),
  Rpc.make("calculatePrimes", { payload, success, error })
) {}
```

Client service:

```ts
export class WorkerClient extends Effect.Service<WorkerClient>()(
  "@org/WorkerClient",
  {
    dependencies: [RpcProtocol],
    scoped: Effect.gen(function* () {
      return { client: yield* RpcClient.make(WorkerRpc) };
    }),
  }
) {}
```

Worker server:

```ts
const RpcWorkerServer = RpcServer.layer(WorkerRpc).pipe(
  Layer.provide(Live),
  Layer.provide(RpcServer.layerProtocolWorkerRunner),
  Layer.provide(BrowserWorkerRunner.layer)
);
```

Effect Bun Starter rule:

- Do not add RPC for the app/API surface while typed `HttpApi` covers the type-safety need.
- Use RPC only when the caller and callee are first-party and the transport is controlled.
- Browser workers are a valid future RPC use case if heavy client CPU work appears.
- If RPC is added later, it should still share schemas with HTTP where operations overlap.

Reference files:

- `packages/client/src/services/worker/worker-rpc.ts:1-25`
- `packages/client/src/services/worker/worker-client.ts:8-20`
- `packages/client/src/services/worker/worker.ts:18-68`

## Server Runtime Composition Rules

The server composes all layers at the entry point.

Rules:

- Build an API layer from contract handlers.
- Provide middleware implementations to that API layer.
- Build infrastructure layers separately.
- Compose CORS, logger, database, telemetry, HTTP server, and app API in one entrypoint layer.
- Launch the final layer once.
- Retry only around failures that are meant to restart the server, such as database connection loss.

Reference files:

- `packages/server/src/server.ts:26-29`
- `packages/server/src/server.ts:31-40`
- `packages/server/src/server.ts:42-57`
- `packages/server/src/server.ts:59-80`
- `packages/server/src/server.ts:83-101`

Effect Bun Starter translation:

- Use Bun's Effect platform adapter instead of Node's `createServer` adapter.
- Keep Effect `Config` for environment variables.
- Keep layer composition at `apps/api/src/main.ts` or a small adjacent runtime module.

## Client Runtime Rules

The React app builds one managed Effect runtime and passes it through context.

Rules:

- Create Effect services for API client, query client, network monitor, and worker client.
- Build one `ManagedRuntime` from the live layer graph.
- Provide runtime through React context.
- Dispose the runtime on provider unmount.
- React hooks run Effects through the runtime; components do not call `Effect.runPromise` directly.

Reference files:

- `packages/client/src/global-providers.tsx:51-61`
- `packages/client/src/services/runtime/runtime-context.tsx:1-4`
- `packages/client/src/services/runtime/runtime-provider.tsx:6-24`
- `packages/client/src/services/runtime/use-runtime.tsx:5-9`
- `packages/client/src/services/live-layer.ts:8-13`

## React Query Integration Rules

The repo wraps TanStack Query so React gets promise APIs while the app keeps Effect services internally.

Rules:

- Query/mutation functions return `Effect.Effect`.
- The wrapper runs those effects through the app runtime.
- Expected failures remain typed query errors.
- Defects become a `QueryDefect` wrapper.
- The wrapper owns toast behavior, tracing spans, and cause logging.
- Feature modules own cache updates and optimistic behavior.

Reference files:

- `packages/client/src/lib/tanstack-query/effect-query.ts:29-127`
- `packages/client/src/lib/tanstack-query/effect-query.ts:150-174`
- `packages/client/src/lib/tanstack-query/effect-query.ts:204-232`
- `packages/client/src/services/data-access/todos-queries.tsx:16-94`
- `packages/client/src/services/data-access/todos-queries.tsx:96-133`

Effect Bun Starter rule:

- React components should use feature hooks.
- Feature hooks should call Effect services.
- Effects should run through the shared runtime, not ad hoc runners.

## Schema And Error Rules

Rules:

- Brand IDs at the domain boundary.
- Model request and response bodies as `Schema.Class`.
- Model expected failures as tagged schema errors.
- Annotate HTTP errors with status codes in the contract package.
- Decode persistence rows into domain schemas before returning them from repositories.
- Treat parse errors from trusted persistence as defects unless there is a recovery path.
- Keep event streams as tagged schema unions.

Reference files:

- `packages/domain/src/EntityIds.ts:3-7`
- `packages/domain/src/api/TodosContract.ts:8-35`
- `packages/domain/src/CustomHttpApiError.ts:8-61`
- `packages/domain/src/CustomHttpApiError.ts:285-296`
- `packages/domain/src/api/SseContract.ts:8-30`
- `packages/server/src/public/todos/todos-repository.ts:21-29`
- `packages/server/src/public/todos/todos-repository.ts:49-58`
- `packages/server/src/public/todos/todos-repository.ts:68-74`

Effect Bun Starter translation:

- Use Effect v4 `Schema.TaggedErrorClass` for domain and HTTP errors.
- Keep JSON Schema only as interop output, not a parallel modeling source.

## Auth And Policy Rules

The reference repo separates auth facts from policy checks.

Rules:

- The domain package defines `CurrentUser` and auth middleware requirements.
- Endpoint groups opt into auth at the contract level.
- The server provides the middleware implementation.
- Policy combinators operate on `CurrentUser` and fail with typed forbidden errors.
- Better Auth or any concrete auth provider should populate `CurrentUser`; domain policy should not know provider internals.

Reference files:

- `packages/domain/src/Policy.ts:27-42`
- `packages/domain/src/Policy.ts:62-108`
- `packages/domain/src/internal/policy.ts:8-14`
- `packages/domain/src/api/TodosContract.ts:37-39`
- `packages/domain/src/api/SseContract.ts:32-34`
- `packages/server/src/public/middlewares/auth-middleware-live.ts:44-61`
- `packages/domain/test/policy.test.ts:21-320`

Effect Bun Starter rule:

- Put `CurrentUser`, permissions, and policy combinators in the domain layer.
- Put Better Auth session validation in the server adapter.
- Keep authorization checks as composable Effect values.

## Database Adapter Rules

The database package wraps Drizzle and Postgres behind a small Effect interface.

Rules:

- Database package owns Drizzle schema and migrations.
- Database layer owns pool lifecycle with acquire/release.
- Database adapter normalizes driver errors into typed errors.
- Database adapter exposes transaction-aware query execution.
- Repositories use `makeQuery` so they automatically use the ambient transaction if present.
- Repositories decode rows to domain schemas before returning.
- Server entrypoint attaches connection listeners and can retry on connection loss.

Reference files:

- `packages/database/src/tables/todos-tables.ts:7-17`
- `packages/database/src/Database.ts:26-39`
- `packages/database/src/Database.ts:41-71`
- `packages/database/src/Database.ts:78-91`
- `packages/database/src/Database.ts:115-136`
- `packages/database/src/Database.ts:153-207`
- `packages/database/src/Database.ts:217-221`
- `packages/server/src/public/todos/todos-repository.ts:9-106`

Effect Bun Starter rule:

- Keep database adapter code out of domain.
- Keep repositories in server-side modules.
- Decode persistence output at repository boundaries.

## SSE Rules

The repo treats SSE as HTTP plus schema-tagged event streams.

Server rules:

- Track connections by user ID.
- Each connection owns a queue.
- Register connections in a scoped effect.
- Unregister and shut down queues in finalizers.
- Encode events with the shared event schema once.
- Send keep-alives.

Client rules:

- Use a raw client only to access `response.stream`.
- Decode text, split lines, filter `data:` lines.
- Decode each event with the shared schema.
- Log and drop invalid events.
- Retry connection while the network monitor latch is open.
- Interrupt the fiber on React cleanup.

Reference files:

- `packages/server/src/public/sse/sse-manager.ts:13-129`
- `packages/server/src/public/sse/sse-live.ts:13-70`
- `packages/client/src/services/data-access/sse-queries.tsx:25-84`
- `packages/server/src/public/sse/sse-manager.test.ts:14-104`

Effect Bun Starter rule:

- Use tagged schema events for real-time updates.
- Do not send anonymous stringly JSON events.

## Testing Rules

Rules:

- Use Effect-aware tests for Effect modules.
- Test behavior through module interfaces, not file structure.
- Use scoped tests for resources and background fibers.
- Use test clocks for time-dependent logic.
- Provide layers per test unless sharing a resource is intentional.
- Test policy combinators with success, failure, short-circuiting, and realistic composition.
- Test streaming managers with queues and decoded schema events.

Reference files:

- `setupTests.ts:1-3`
- `vitest.shared.ts:21-38`
- `packages/domain/test/policy.test.ts:21-320`
- `packages/domain/test/ManualCache.test.ts:7-170`
- `packages/server/src/public/sse/sse-manager.test.ts:14-104`

Effect Bun Starter rule:

- Avoid structural tests.
- Keep tests small, behavior-focused, and run against public module seams.

## Tooling And Build Rules

Rules worth adopting:

- Root scripts run all workspaces.
- Package scripts run local build/check/test.
- Strict TypeScript project references.
- Workspace aliases for package imports.
- Generated exports only if package publishing needs it.

Rules not worth copying now:

- Pnpm, because Effect Bun Starter uses Bun.
- ESLint/Prettier, because Effect Bun Starter uses Ultracite/OXC.
- Nix, unless reproducible local environments become a concrete need.
- `@effect/build-utils prepare-v2`, unless Effect Bun Starter adopts the Effect package template.

Reference files:

- `package.json:16-30`
- `tsconfig.base.json:1-51`
- `vitest.workspace.ts:13-18`
- `flake.nix:16-35`
- `docker-compose.yml:1-47`

## ADR Candidates For Effect Bun Starter

### ADR: Shared Domain Contracts Own Client/Server Shape

Decision: define public API contracts, schemas, expected errors, auth middleware contracts, and event schemas in a shared domain package.

Consequence: client and server both depend on domain; domain depends on neither.

### ADR: Effect HttpApi Is The Default Network Contract

Decision: use Effect `HttpApi` for normal external HTTP and React application HTTP.

Consequence: type-safety comes from shared schemas and Effect client generation, not from hand-written fetch wrappers.

### ADR: Defer RPC Until A Concrete First-Party Transport Needs It

Decision: do not build an RPC API surface while Effect `HttpApi` provides end-to-end type safety for the React app and external HTTP users.

Consequence: RPC is deferred until it has a concrete controlled-transport use case, such as browser workers or another internal channel.

### ADR: Raw HTTP Client Is An Exception

Decision: only build or use a raw HTTP client when a typed client cannot expose needed transport details.

Consequence: SSE or streaming may justify raw access; ordinary JSON CRUD does not.

### ADR: Better Auth Is An Adapter To CurrentUser

Decision: auth provider details stay in server adapters; domain code consumes `CurrentUser` and policies.

Consequence: policy tests do not depend on Better Auth.

### ADR: Database Adapter Owns Transactions And Driver Errors

Decision: centralize pool lifecycle, transaction context, and driver error normalization in the database package.

Consequence: repositories express query intent and domain decoding, not pool management.

### ADR: React Runs Effects Through One Runtime

Decision: create one managed Effect runtime for the React app and expose it through context.

Consequence: hooks call services through the runtime; components do not run effects directly.

### ADR: Realtime Events Are Tagged Schema Values

Decision: encode SSE/realtime payloads as tagged schema unions in the domain package.

Consequence: clients can decode, narrow, and exhaustively handle events.

## Effect Bun Starter Rules To Add To Agent Instructions

- Put shared API contracts in a domain package.
- Use Effect Schema as the single source for request, response, error, and event shapes.
- Use Effect `HttpApi` for type-safe HTTP client/server contracts.
- Defer RPC until a concrete first-party transport needs it.
- Server implements `HttpApi` groups; it does not redefine route DTOs.
- React uses generated typed clients from shared domain contracts.
- Use raw HTTP clients only for streaming or transport-level needs.
- Auth adapters provide `CurrentUser`; policies live in domain.
- Database adapters own pool lifecycle, transactions, and driver error mapping.
- Repositories decode persistence rows into domain schemas.
- Provide layers once at app entry.
- React components do not directly run Effect programs.
- Tests verify behavior through public seams, not file structure.

## What Not To Copy

- Do not copy the entire custom `unsafe-http-api-client` now.
- Do not copy `ManualCache`; it is a real module, but Effect Bun Starter has no current cache need.
- Do not copy Nix setup unless toolchain drift becomes a real problem.
- Do not copy ESLint/Prettier config into the OXC setup.
- Do not copy Effect v3 syntax into Effect v4 code.
- Do not add package build generation until packages need publishing-style exports.

## Recommended Effect Bun Starter Shape

```text
packages/domain
  src/api/*Contract.ts        # HttpApi groups, payloads, responses, errors
  src/DomainApi.ts            # composed shared API
  src/EntityIds.ts            # branded IDs
  src/Policy.ts               # CurrentUser, permissions, policy combinators
  src/events/*                # tagged event unions when needed

apps/api
  src/api.ts                  # server Api wraps DomainApi
  src/main.ts                 # runtime/layer composition
  src/public/*/*-live.ts      # HttpApiBuilder.group handlers
  src/public/*/*-repository.ts# server-side repositories

packages/database
  src/Database.ts             # pool, tx, errors, makeQuery
  src/tables/*                # Drizzle tables

apps/web or packages/client
  src/services/api-client.ts  # typed client from DomainApi
  src/services/runtime/*      # ManagedRuntime provider
  src/features/*              # hooks and cache updates
```

This preserves the reference repo's guarantees while staying smaller: shared contracts first, typed HTTP API client/server second, RPC later only if it earns its keep.
