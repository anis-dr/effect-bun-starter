import { assert, layer } from "@effect/vitest";
import { Effect } from "effect";

import { Database, DatabaseSmoke } from "../src/index.js";

layer(Database.layer)("database", (it) => {
  it.effect("checks database connectivity", () =>
    Effect.gen(function* checksDatabaseConnectivity() {
      const result = yield* DatabaseSmoke.check();
      assert.deepStrictEqual(result, { ok: 1 });
    })
  );
});
