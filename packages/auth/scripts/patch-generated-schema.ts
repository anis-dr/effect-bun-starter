/// <reference types="bun" />

import * as BunFileSystem from "@effect/platform-bun/BunFileSystem";
import { Effect, FileSystem } from "effect";

const file = "src/schema/auth-schema.ts";

const patchSchema = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const source = yield* fileSystem.readFileString(file);
  const body = source
    .replace(
      'import { relations } from "drizzle-orm";',
      'import { user } from "@effect-bun-starter/database";\nimport { sql } from "drizzle-orm";\nimport { relations } from "drizzle-orm/_relations";'
    )
    .replace(
      'import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";',
      'import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";'
    )
    .replace(
      /\nexport const user = pgTable\("user", \{[\s\S]*?\n\}\);\n/,
      "\nexport { user };\n"
    )
    .replaceAll("/* @__PURE__ */ ", "")
    .replaceAll(".$onUpdate(() => new Date())", ".$onUpdate(() => sql`now()`)")
    // ponytail: keep Better Auth output formatter-stable without shelling out.
    .replaceAll(",\n);", "\n);");

  yield* fileSystem.writeFileString(file, body);
});

const program = patchSchema.pipe(Effect.provide(BunFileSystem.layer));
Effect.runPromise(program);
