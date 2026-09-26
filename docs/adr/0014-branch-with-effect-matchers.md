# Branch with Effect Matchers

Effect Bun Starter branches with Effect's matchers, never with local helpers such as `choose` or `when`. The lint config bans ternaries (`effect(noTernary)`) and `null`/`undefined` literals (`effect(noNullish)`), and helpers written to dodge those rules hide what the branch is about.

- Two-way value: `Boolean.match(condition, { onFalse, onTrue })`.
- A union such as a status: `Match.value(status).pipe(Match.when(...), ..., Match.exhaustive)`. Match the union, not booleans derived from it, so adding a case fails the build where it isn't handled.
- Optional data: keep it as an `Option` and use `Option.match`. In JSX, `Option.getOrNull(Option.map(option, render))` renders something or nothing, and `Option.getOrNull(Option.liftPredicate(node, () => condition))` covers a bare condition.
