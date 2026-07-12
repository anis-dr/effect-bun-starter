# Prefer Effect.fn for Effectful Functions

Effect Bun Starter will prefer `Effect.fn` for named effectful functions and service methods instead of writing raw `Effect.gen` at call sites. `Effect.fn` keeps generator-style sequencing available while adding names, tracing, and a consistent service-method shape; raw `Effect.gen` should be reserved for small local composition where a named function would add noise.
