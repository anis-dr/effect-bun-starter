import { assert, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { StoreId } from "../src/index.js";

// The TypeID spec's own example pair.
const uuid = "01890a5d-ac96-774b-bcce-b302099a8057";
const wire = "store_01h455vb4pex5vsknk084sn02q";

it.effect("reads a prefixed ID as the uuid the database stores", () =>
  Effect.gen(function* () {
    assert.strictEqual(yield* Schema.decodeUnknownEffect(StoreId)(wire), uuid);
  })
);

it.effect("writes a stored uuid as its prefixed ID", () =>
  Effect.gen(function* () {
    const id = yield* Schema.decodeUnknownEffect(StoreId)(wire);
    assert.strictEqual(yield* Schema.encodeEffect(StoreId)(id), wire);
  })
);

it.effect("refuses another entity's prefix and overflowing suffixes", () =>
  Effect.gen(function* () {
    for (const input of [
      "user_01h455vb4pex5vsknk084sn02q",
      "store_81h455vb4pex5vsknk084sn02q",
      "01890a5d-ac96-774b-bcce-b302099a8057",
    ]) {
      const exit = yield* Effect.exit(
        Schema.decodeUnknownEffect(StoreId)(input)
      );
      assert.strictEqual(exit._tag, "Failure", input);
    }
  })
);
