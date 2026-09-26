import { Database, inArray, stores } from "@effect-bun-starter/database";
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

/** Inserts stores named `names`, each suffixed with one token so runs don't
 * collide; removes them when the test ends. Returns the stored names. */
const insertStores = Effect.fn("StoresTest.insertStores")(function* (
  names: readonly string[]
) {
  const db = yield* Database;
  const token = globalThis.crypto.randomUUID().slice(0, 8);
  const inserted = yield* db
    .insert(stores)
    .values(names.map((name) => ({ name: `${name} ${token}` })))
    .returning({ id: stores.id, name: stores.name });
  const ids = inserted.map(({ id }) => id);
  yield* Effect.addFinalizer(() =>
    Effect.orDie(db.delete(stores).where(inArray(stores.id, ids)))
  );
  return inserted.map(({ name }) => name);
});

/** `GET /stores?q=`, keeping only the names in `among`, in answer order. */
const search = Effect.fn("StoresTest.search")(function* (
  q: string,
  among: readonly string[]
) {
  const app = yield* TestApp;
  const response = yield* app.request(
    new Request(`http://localhost:3002/stores?q=${encodeURIComponent(q)}`)
  );
  assert.strictEqual(response.status, 200);
  const listed = yield* decodeJson(WireStores, response);
  return listed.map(({ name }) => name).filter((name) => among.includes(name));
});

layer(Layer.merge(TestApp.layer, Database.layer))((it) => {
  it.effect("lists a stored uuid as its prefixed store ID", () =>
    Effect.gen(function* () {
      const app = yield* TestApp;
      const db = yield* Database;
      const removeStore = db.delete(stores).where(inArray(stores.id, [uuid]));
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

  it.effect("finds a name whatever its accents and case", () =>
    Effect.gen(function* () {
      const names = yield* insertStores(["Café Lumière", "Harbor Books"]);
      assert.deepStrictEqual(yield* search("cafe lumiere", names), [names[0]]);
    })
  );

  it.effect("finds a name despite a typo", () =>
    Effect.gen(function* () {
      const names = yield* insertStores(["Lantern Works", "Harbor Books"]);
      assert.deepStrictEqual(yield* search("lanterm", names), [names[0]]);
    })
  );

  it.effect("ranks the closest name first", () =>
    Effect.gen(function* () {
      // Alphabetical order would put "Blue Lanterns" first.
      const names = yield* insertStores(["Lantern", "Blue Lanterns"]);
      assert.deepStrictEqual(yield* search("lantern", names), [
        names[0],
        names[1],
      ]);
    })
  );
});
