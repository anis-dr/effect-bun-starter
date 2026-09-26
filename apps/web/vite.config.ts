import babel from "@rolldown/plugin-babel";
import stylex from "@stylexjs/unplugin";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const config = defineConfig({
  optimizeDeps: { exclude: ["@opentelemetry/instrumentation-fetch"] },
  plugins: [
    devtools(),
    nitro(),
    tanstackStart({ client: { entry: "client.tsx" } }),
    // Compiles the app's own `stylex.create` (ADR 0015, step 4). Astryx ships
    // precompiled with the default `x` class prefix, so ours use `p` (as
    // Astryx's example-nextjs-stylex does), and our rules sit in layers after
    // Astryx's so an `xstyle` override wins over the theme.
    stylex.vite({
      classNamePrefix: "p",
      devMode: "css-only",
      useCSSLayers: {
        before: ["reset", "astryx-base", "astryx-theme"],
        prefix: "app",
      },
    }),
    viteReact(),
    babel({
      include: /\.[jt]sx?$/,
      presets: [reactCompilerPreset()],
    }),
  ],
  resolve: { tsconfigPaths: true },
  ssr: { noExternal: ["@astryxdesign/theme-neutral"] },
});

export default config;
