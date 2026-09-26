import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    "**/dist/**",
    // drizzle-kit writes these snapshots; formatting them churns every migration.
    "**/drizzle/**/snapshot.json",
    // Installed agent skills and agent config are not project source.
    ".agent/**",
    ".agents/**",
    ".claude/**",
    ".codex/**",
    ".continue/**",
    ".cursor/**",
    ".gemini/**",
    ".opencode/**",
    ".pi/**",
    ".roo/**",
    ".windsurf/**",
    ".zed/**",
    "tools/oxlint/anti-slop/**",
  ],
});
