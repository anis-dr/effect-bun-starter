# Name Effect Code the Way Effect Does

Services, layers, errors, spans, atoms and the files that hold them follow the names Effect v4 itself uses, not the `XLive` style this repo started with. `XLive` and `-live.ts` came from an Effect 2/3-era example monorepo ([docs/research/lucas-barake-effect-monorepo-patterns.md](../research/lucas-barake-effect-monorepo-patterns.md)); by Effect v4 they survive only in two old test fixtures, while the library source and the Effect guides agree on the names below. Following them lets a reader move between our code, Effect's source and its docs without translating.

What we measured (Effect `4.0.0-rc.117` source and the effect-solutions guides, 2026-09-26):

- **Layers.** `layer` appears 135 times in Effect's source, `layerConfig` 21, then `layerMemory`, `layerTest`, `layerNoop` and more. A service's layers are static `layer` / `layer<Variant>` members (`Database.layer`); the guide names any other Layer in camelCase ending in `Layer` (`appLayer`).
- **Errors.** 287 of 321 error classes in Effect end in `Error`. The other 34 are reasons inside a parent error (`UniqueViolation` in `SqlError`). HTTP API errors are named for their outcome (`HttpApiError.NotFound`), and so are ours (`StoresUnavailable`).
- **Services.** Keys are `"@<scope>/<package>/<Service>"` (`"@effect/ai-openai/OpenAiClient"`). Ours are the nearest `package.json` name, then the class name (`"@effect-bun-starter/database/Database"`), so renaming the workspace scope renames every key with it.
- **Spans.** `Effect.fn("<Module>.<operation>")`.
- **Files.** Effect's library modules are PascalCase namespace files; that is a library style. App files stay kebab-case, named for what they hold.

The rules, one line each, are in [CONVENTIONS.md](../../CONVENTIONS.md); `anti-slop-effect/effect-naming` enforces the ones a linter can check. Oxlint 1.85 has no configurable naming rule (no `naming-convention`, `id-match` or `filename-case`), so the rule is ours.
