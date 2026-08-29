/// <reference types="bun" />

import * as BunFileSystem from "@effect/platform-bun/BunFileSystem";
import { Effect, FileSystem } from "effect";

const file = "src/schema/auth-schema.ts";

const patchSchema = Effect.gen(function* patchSchema() {
  const fileSystem = yield* FileSystem.FileSystem;
  const source = yield* fileSystem.readFileString(file);
  const body = source
    .replace(
      'import { relations } from "drizzle-orm";',
      'import { sql } from "drizzle-orm";\nimport { relations } from "drizzle-orm/_relations";'
    )
    .replaceAll("/* @__PURE__ */ ", "")
    .replaceAll(".$onUpdate(() => new Date())", ".$onUpdate(() => sql`now()`)")
    // ponytail: keep Better Auth output formatter-stable without shelling out.
    .replaceAll(",\n);", "\n);");

  yield* fileSystem.writeFileString(
    file,
    `/* eslint-disable sort-keys */\n${body}`
  );
});

const program = patchSchema.pipe(Effect.provide(BunFileSystem.layer));
Effect.runPromise(program);
