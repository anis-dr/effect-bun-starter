# Lucas Barake Effect Monorepo Video Notes

Video: `https://www.youtube.com/watch?v=QtNixeJp6Sg&t=9s`

Transcript source: YouTube automatic captions, downloaded with `yt-dlp`.

## How To Transcribe

Direct captions worked. No audio transcription fallback was needed.

```sh
yt-dlp --list-subs "https://www.youtube.com/watch?v=QtNixeJp6Sg&t=9s"
yt-dlp --skip-download --write-auto-subs --sub-langs "en-orig" --sub-format json3 -o "/tmp/%(id)s.%(ext)s" "https://www.youtube.com/watch?v=QtNixeJp6Sg&t=9s"
jq -r '.events[] | select(.segs) | [(.tStartMs // 0), (.segs | map(.utf8) | join(""))] | @tsv' "/tmp/QtNixeJp6Sg.en-orig.json3"
```

Local extracted files:

- `/var/folders/fw/kj9kfzq97mn9qhxn0xp1p9cc0000gn/T/opencode/youtube-effect-monorepo-transcript/QtNixeJp6Sg.en-orig.json3`
- `/var/folders/fw/kj9kfzq97mn9qhxn0xp1p9cc0000gn/T/opencode/youtube-effect-monorepo-transcript/QtNixeJp6Sg.en-orig.vtt`

## Main Argument

The author is moving away from tRPC, not because tRPC is bad, but because he wants stronger runtime guarantees than type inference plus SuperJSON provides.

His stated requirements:

- Runtime validation on the client, not just compile-time inference.
- One schema that encodes on the server and decodes on the client.
- Custom data types beyond SuperJSON defaults.
- Type-safe expected errors.
- Built-in telemetry with minimal boilerplate.
- Predictable concurrency primitives.
- Type-safe dependency injection with lifecycle awareness.
- Composable Effect programs that stay testable.

## Key Takeaways For Effect Bun Starter

### Typed HTTP Can Replace RPC For The App Surface

He explicitly says the Effect Platform `HttpApi` approach is still a traditional REST API. Non-TypeScript consumers can call it normally. TypeScript clients get generated, schema-aware calls from the same contract.

Effect Bun Starter decision: default to Effect `HttpApi` for the React app and public API. Do not add RPC unless a separate controlled transport needs it.

### Runtime Schema Guarantees Are The Point

He emphasizes that Effect Schema is bidirectional: the same definition encodes server output and decodes client input at runtime.

Effect Bun Starter rule: Effect Schema is the only source of truth for payloads, successes, expected errors, and events.

### Domain Package Owns The API Contract

The video walks through `domain/api/Contracts`, `TodosContract`, and `DomainApi`. The domain package exposes groups and schemas consumed by both client and server.

Effect Bun Starter rule: put `DomainApi`, endpoint groups, branded IDs, errors, and policy contracts in `packages/domain`.

### Endpoint Groups Are REST Plus Type Safety

Each endpoint has:

- an identifier for ergonomic client access, like `client.todos.get`,
- an HTTP method,
- a path,
- success schema,
- payload schema when needed,
- expected domain errors.

Effect Bun Starter rule: every external operation gets HTTP metadata and schemas in the contract. No shadow DTOs in server or client.

### Expected Errors Are Typed Values

He calls out that internal server errors are assumed and do not need to be modeled. Expected domain errors should be modeled, annotated with HTTP status, serialized, and exposed to the client type system.

Effect Bun Starter rule: model recoverable/domain errors as tagged schema errors; convert unexpected repository or infrastructure failures to defects unless there is a real recovery path.

### Server Handlers Must Satisfy The Contract

The video shows that `HttpApiBuilder.group(Api, "todos", ...)` narrows handlers to the selected group. Missing handlers and undeclared error types become type errors.

Effect Bun Starter rule: server code implements `HttpApi` groups only. It should not manually duplicate routes or response shapes.

### Client Calls Use Dot-Notation Generated From The Contract

The author shows `client.todos.get`, `client.todos.create`, `client.todos.update`, and `client.todos.delete`. The client encodes payloads and decodes responses using the contract schemas.

Effect Bun Starter rule: React data access should call the typed client generated from `DomainApi`; no ad hoc `fetch` wrappers for normal JSON endpoints.

### HTTP Client Transform Is The Adapter Point

He uses `transformClient` to add retry policies and says it can also map requests to add headers, URL prefixes, or tokens.

Effect Bun Starter rule: auth headers, retry, base URL, and request middleware belong in the HTTP client service adapter, not in feature code.

### React Data Access Is Encapsulated By Feature Namespace

He likes organizing frontend data access in namespace modules that expose queries and mutations. TanStack Query is just the cache/tooling layer under wrappers.

Effect Bun Starter rule: components use feature hooks; hooks use Effect services; cache updates stay near feature data access code.

### Query Wrappers Bridge Effect And React

The video explains `useEffectMutation`, `useEffectQuery`, and `useEffectInfiniteQuery`. They run Effects, handle toasts, success values, expected errors, and defects.

Effect Bun Starter rule: if we use TanStack Query, wrap it once for Effect. Do not let every component invent Effect-to-Promise handling.

### Forms Decode Encoded Values Through Schema

He shows a TanStack Form adapter where default values conform to the encoded type, validation decodes via schema, and submitted values decode before mutation.

Effect Bun Starter rule: form validation should reuse Effect Schema, with encoded form values decoded before calling domain operations.

## ADR Updates Implied By The Video

### Use Effect HttpApi As Default Network Contract

The video confirms this. `HttpApi` gives the type-safe client/server workflow we wanted from RPC while staying regular HTTP for external users.

### Defer RPC

The video does not use RPC for the app/server API. It uses HTTP API modules for that. RPC can wait until we have a worker or internal channel.

### Shared Contract Package First

The first package to add after the API foundation should likely be `packages/domain`, not a generic RPC registry.

### Runtime Safety Over Inference Magic

The important guarantee is runtime encode/decode from shared schemas, not just TypeScript inference.

## Transcript Highlights

- "TRPC has been my go-to... but I've decided to abandon TRPC."
- "I started noticing some issues with runtime safety."
- "A client side doesn't use those schemas as runtime guard rails."
- "Effect schema is designed to be bidirectional."
- "You use the exact same schema definition to both encode data and validate it on the server side and to decode and validate it when it arrives on the client side."
- "The nice thing about the HTTP API module is that it doesn't use a custom protocol or contract like TRPC does. It's just a traditional REST API."
- "This schema right here is what the server and the client will both use to decode and encode."
- "Errors are serializable too because ultimately schema is handling all of these bidirectional nature for us."
- "Everything is tracked via the type system."
- "When we call todos.get, it is going to use that schema defined in the contract to decode the response body."
