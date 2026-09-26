# Effect Bun Starter Agent Instructions

## Coding Standards

Before writing or reviewing code, read [CODING_STANDARDS.md](CODING_STANDARDS.md): every rule this repo follows (code, naming, web, work), one line each, with its reason and what enforces it.

## Development Mode

Use Ponytail mode for this project at full intensity.

## Principles

Before design, planning, implementation, refactoring, debugging, tests, delegation, or declaring work done, call the Skill tool with "principles" and read every reference whose line matches the task, in full. Name the principles that changed a decision in your reply. This applies to dispatched workers too.

## Scratch Work

Put files that are not meant to be committed in `.scratchpad/` at the repository root, one folder per task. Git ignores the folder. This covers probe scripts, spikes, drafts, captured output, screenshots and hand-offs between agents.

## Web Work

Before writing HTML, CSS or client-side code, search the `modern-web-guidance` skill for the task, retrieve the matching guides, and check the finished code against them. Astryx components come first; the guides cover what Astryx leaves open.

The rendering, styling and sizing rules are in [CODING_STANDARDS.md](CODING_STANDARDS.md#web) and [ADR 0015](docs/adr/0015-style-through-the-astryx-ladder.md).

## Effect

Consult the Effect references before writing Effect code:

1. The `effect-ts` skill first, for Effect v4.
2. `effect-index` only as a secondary routing aid; it is older and v3-oriented.
3. `effect-solutions list`, then `effect-solutions show <topic>` (several topics at once): quick-start, project-setup, tsconfig, basics, services-and-layers, data-modeling, error-handling, config, testing, cli.
4. `~/.local/share/effect-solutions/effect` for real Effect v4 source when the docs are not enough.
5. Effect Patterns for concrete implementation examples.

The Effect rules this repo follows (Schema, `Effect.fn`, `Config`, typecheck) are in [CODING_STANDARDS.md](CODING_STANDARDS.md#code).

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
- Custom styling: component props first; else the xstyle prop / StyleX tokens (@astryxdesign/core/theme/tokens.stylex). No raw hex/px.
- Tokens for every value (`astryx docs tokens`). Brand/accent belongs in the theme (`astryx theme list` / `theme add <slug>`, or `astryx theme template` for a custom one) — never override --color-* in :root.
- SELF-CHECK before you finish: re-read the file and replace any className=, style={{…}}, raw <div>/<span> layout, imported .css/@apply, or hardcoded #hex/px with the component or the xstyle prop + a token. If unsure a component/prop exists, run `astryx component <Name>` / `astryx search "<thing>"`; don't hand-roll CSS.

MORE CLI:
  search "<query>"   find any component / hook / doc / template / block
  component --list   90+ components by category
  template --list    page + block recipes
  docs <topic>       browser-support, cli-integrations, color, elevation, getting-started, icons, illustrations, internationalization, layout, migration, motion, principles, shape, spacing, styling-libraries, styling, theme, tokens, typography, working-with-ai
  swizzle <Name>     eject component source for deep customization
  upgrade --apply    run after any Astryx or integration dependency bump
<!-- ASTRYX:END -->
