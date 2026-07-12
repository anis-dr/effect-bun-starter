/// <reference types="bun" />

void (async () => {
  const file = "src/schema/auth-schema.ts";
  const source = await Bun.file(file).text();
  const body = source
    .replace(
      'import { relations } from "drizzle-orm";',
      'import { relations } from "drizzle-orm/_relations";'
    )
    .replaceAll("/* @__PURE__ */ ", "")
    // ponytail: keep Better Auth output formatter-stable without shelling out.
    .replaceAll(",\n);", "\n);");

  await Bun.write(file, `/* eslint-disable sort-keys */\n${body}`);
})();
