# Use Source Exports With Declaration-Only References

Effect Bun Starter internal packages use TypeScript source exports plus declaration-only project-reference output. This keeps local DX simple by resolving workspace imports to editable source while still giving `tsc -b` valid package-level incremental checks. Package `dist` output, generated exports, and publishing-style build steps are deferred until Effect Bun Starter needs package publishing or non-Bun consumers.

Each package's `build` (`tsc --build`) emits those declarations into `.tsbuild`. Turbo's `typecheck` depends on `^build`, so a package's referenced packages have their declarations before it runs `tsc --noEmit` on its source and test configs; a clean checkout typechecks without a prior build.
