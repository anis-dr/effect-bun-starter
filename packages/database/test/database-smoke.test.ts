import { expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { DatabaseLive, DatabaseSmoke } from "../src/index.js";

it.effect("checks database connectivity", () =>
  Effect.gen(function* checksDatabaseConnectivity() {
    const result = yield* DatabaseSmoke.check();

    expect(result).toEqual({ ok: 1 });
  }).pipe(Effect.provide(DatabaseLive))
);
