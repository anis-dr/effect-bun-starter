import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
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
    tailwindcss(),
    tanstackStart({ client: { entry: "client.tsx" } }),
    viteReact(),
    babel({
      include: /\.[jt]sx?$/,
      presets: [reactCompilerPreset()],
    }),
  ],
  resolve: { tsconfigPaths: true },
});

export default config;
