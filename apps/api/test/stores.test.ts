import { Database, eq, stores } from "@effect-bun-starter/database";
import { StoreId } from "@effect-bun-starter/domain";
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";

import { TestApp, decodeJson } from "./test-app.js";

const WireStores = Schema.Array(
  Schema.Struct({ id: Schema.String, name: Schema.String })
);

// The TypeID spec's own example: uuid 01890a5d-ac96-774b-bcce-b302099a8057.
const wireId = "store_01h455vb4pex5vsknk084sn02q";
const uuid = Schema.decodeSync(StoreId)(wireId);

layer(Layer.merge(TestApp.layer, Database.layer))((it) => {
  it.effect("lists a stored uuid as its prefixed store ID", () =>
    Effect.gen(function* () {
      const app = yield* TestApp;
      const db = yield* Database;
      const removeStore = db.delete(stores).where(eq(stores.id, uuid));
      yield* removeStore;
      yield* Effect.addFinalizer(() => Effect.orDie(removeStore));
      yield* db.insert(stores).values({ id: uuid, name: "Typed ID store" });

      const response = yield* app.request(
        new Request("http://localhost:3002/stores")
      );
      const listed = yield* decodeJson(WireStores, response);

      assert.strictEqual(response.status, 200);
      assert.deepInclude(listed, {
        id: wireId,
        name: "Typed ID store",
      });
    })
  );
});
