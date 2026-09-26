import stylex from "@stylexjs/unplugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    // Components call `stylex.create`, which only works compiled (ADR 0015).
    // Its dev-server hook starts a CSS-update interval that it clears only
    // when an HTTP server closes; Vitest's middleware-mode server has none, so
    // the interval kept the process alive. Tests need the transform alone.
    Object.assign(stylex.vite({ classNamePrefix: "p", devMode: "css-only" }), {
      configureServer: undefined,
    }),
  ],
  resolve: { tsconfigPaths: true },
  test: { environment: "node" },
});
