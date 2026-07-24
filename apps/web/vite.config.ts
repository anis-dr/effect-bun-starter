import babel from "@rolldown/plugin-babel";
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
