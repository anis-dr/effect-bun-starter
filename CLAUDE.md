# Effect Bun Starter Agent Instructions

## Conventions

Before writing or reviewing code, read [CONVENTIONS.md](CONVENTIONS.md): every rule this repo follows (code, naming, web, work), one line each, with its reason and what enforces it.

## Development Mode

Use Ponytail mode for this project at full intensity.

- Before writing code, ask: does this need to exist, can the standard library do it, can the platform do it natively, or can it be one line?
- Build the minimum that works; prefer deletion, boring code, and fewer files.
- Do not add unrequested abstractions, avoidable dependencies, or boilerplate.
- Mark intentional simplifications with a `ponytail:` comment.
- Do not simplify away trust-boundary validation, data-loss prevention, security, accessibility basics, or explicit requirements.

## Principles

Before design, planning, implementation, refactoring, debugging, tests, delegation, or declaring work done, call the Skill tool with "principles" and read every reference whose line matches the task, in full. Name the principles that changed a decision in your reply. This applies to dispatched workers too.

## Scratch Work

Put files that are not meant to be committed in `.scratchpad/` at the repository root, one folder per task. Git ignores the folder. This covers probe scripts, spikes, drafts, captured output, screenshots and hand-offs between agents.

## Web Work

Before writing HTML, CSS or client-side code, search the `modern-web-guidance` skill for the task, retrieve the matching guides, and check the finished code against them. Astryx components come first; the guides cover what Astryx leaves open.

The rendering rules are in [CONVENTIONS.md](CONVENTIONS.md#web).

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
- Package `typecheck` scripts run `tsc --noEmit` for both configs; turbo builds the referenced packages' declarations first (`typecheck` depends on `^build`), so a clean checkout typechecks. Config-only packages do not need fake typecheck scripts.

Never guess at Effect patterns. Check the references first.

<!-- effect-solutions:end -->

<!-- ASTRYX:START -->
Astryx v0.6.3 · 90+ components
CLI: run every command as `bunx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in your app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — discover, don't guess. Before writing UI:
1. `astryx build "<idea>"` — START HERE: returns a kit (closest [page] + [block]s + [component]s). No args = full playbook.
2. `astryx template <name> [--skeleton]` — scaffold the [page]/[block]s it named, or study their layout. Templates are reference code.
3. `astryx component <Name>` — props + examples for every component you use.

RULES:
- No <div> — components do all layout/spacing, page frame included.
- Frame first: read `astryx docs layout` before writing any page or screen — page frame, region widths, breakpoint behavior.
- Dense data = rows (Table, List/Item), never Card-wrapped list items; Card is for standalone widgets. Status = StatusDot/Token; Badge = counts only.
- Custom styling: component props first; else style/className with tokens — var(--color-*|--spacing-*|--radius-*). No raw hex/px. (No StyleX/Tailwind compiler here — don't use xstyle/utility classes.)
- Tokens for every value (`astryx docs tokens`). Brand/accent belongs in the theme (`astryx theme list` / `theme add <slug>`, or `astryx theme template` for a custom one) — never override --color-* in :root.
- SELF-CHECK before you finish: re-read the file and replace any raw <div>/<span> layout, imported .css/@apply, or hardcoded value (#hex, 16px) with the component or a token (var(--color-*|--spacing-*|…)). If unsure a component/prop exists, run `astryx component <Name>` / `astryx search "<thing>"`; don't hand-roll CSS.

MORE CLI:
  search "<query>"   find any component / hook / doc / template / block
  component --list   90+ components by category
  template --list    page + block recipes
  docs <topic>       browser-support, cli-integrations, color, elevation, getting-started, icons, illustrations, internationalization, layout, migration, motion, principles, shape, spacing, styling-libraries, styling, theme, tokens, typography, working-with-ai
  swizzle <Name>     eject component source for deep customization
  upgrade --apply    run after any Astryx or integration dependency bump
<!-- ASTRYX:END -->
