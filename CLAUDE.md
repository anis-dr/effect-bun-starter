# Effect Bun Starter Agent Instructions

## Development Mode

Use Ponytail mode for this project at full intensity.

- Before writing code, ask: does this need to exist, can the standard library do it, can the platform do it natively, or can it be one line?
- Build the minimum that works; prefer deletion, boring code, and fewer files.
- Do not add unrequested abstractions, avoidable dependencies, or boilerplate.
- Mark intentional simplifications with a `ponytail:` comment.
- Do not simplify away trust-boundary validation, data-loss prevention, security, accessibility basics, or explicit requirements.

<!-- effect-solutions:start -->

## Effect Best Practices

**IMPORTANT:** Always consult Effect references before writing Effect code.

1. Use the `effect-ts` skill first for Effect v4 guidance.
2. Use `effect-index` only as a secondary routing aid; it is helpful but older/v3-oriented.
3. Run `effect-solutions list` to see available guides.
4. Run `effect-solutions show <topic>` for relevant patterns. It supports multiple topics.
5. Search `~/.local/share/effect-solutions/effect` for real Effect v4 implementations when documentation is not enough.
6. Consult Effect Patterns for concrete implementation examples.

Topics: quick-start, project-setup, tsconfig, basics, services-and-layers, data-modeling, error-handling, config, testing, cli.

Schema policy:

- Prefer Effect Schema as the primary schema system.
- Use JSON Schema as the bridge when Zod interoperability is needed.
- Do not make Zod a parallel domain modeling source.

Function style:

- Prefer `Effect.fn` for named effectful functions and service methods.
- Use raw `Effect.gen` only for small local composition where a named function would add noise.

Config policy:

- Use `Config.*` from Effect for environment variables.
- Do not read `process.env` or `Bun.env` directly in application code; direct env access belongs only inside an explicit `ConfigProvider` adapter.

Typecheck policy:

- Code workspaces must typecheck source and tests.
- Use `tsconfig.json` for source checks and `tsconfig.test.json` for no-emit test checks.
- Referenced source configs that produce declaration-only outputs should use `tsc --build`, followed by `tsc --noEmit` for tests; non-referenced packages may use no-emit checks for both configs, and config-only packages do not need fake typecheck scripts.

Never guess at Effect patterns. Check the references first.

<!-- effect-solutions:end -->
