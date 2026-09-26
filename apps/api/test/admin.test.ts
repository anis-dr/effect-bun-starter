import { Database, inArray, stores, user } from "@effect-bun-starter/database";
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option, Schema } from "effect";

import {
  TestApp,
  decodeJson,
  encodeJson,
  signUp,
  testSuperadminEmail,
} from "./test-app.js";

const ErrorResponse = Schema.Struct({ _tag: Schema.String });
const RoleResponse = Schema.Struct({ role: Schema.String });
const StoreResponse = Schema.Struct({ id: Schema.String, name: Schema.String });
const AdminResponse = Schema.Struct({
  email: Schema.String,
  name: Schema.String,
  userId: Schema.String,
});
const AdminsResponse = Schema.Array(AdminResponse);

const call = Effect.fn("AdminTest.call")(function* (
  method: "DELETE" | "GET" | "POST",
  path: string,
  cookie: string,
  body: Option.Option<unknown> = Option.none()
) {
  const app = yield* TestApp;
  return yield* app.request(
    new Request(
      `http://localhost:3002${path}`,
      Option.match(body, {
        onNone: (): RequestInit => ({ headers: { cookie }, method }),
        onSome: (json): RequestInit => ({
          body: encodeJson(json),
          headers: { "content-type": "application/json", cookie },
          method,
        }),
      })
    )
  );
});

/** The response's status and error tag, for refusals. */
const refusal = Effect.fn("AdminTest.refusal")(function* (response: Response) {
  const { _tag } = yield* decodeJson(ErrorResponse, response);
  return [response.status, _tag];
});

/** Accounts for `names` plus the superadmin, cleared before (a crashed run
 * may have left them) and after the test; admin rows and sessions cascade. */
const testEmails = Effect.fn("AdminTest.testEmails")(function* (
  names: readonly string[]
) {
  const db = yield* Database;
  const token = globalThis.crypto.randomUUID().slice(0, 8);
  const emails = names.map((name) => `${name}-${token}@example.com`);
  const owned = [testSuperadminEmail, ...emails];
  const removeAccounts = db.delete(user).where(inArray(user.email, owned));
  yield* removeAccounts;
  yield* Effect.addFinalizer(() => Effect.orDie(removeAccounts));
  return emails;
});

const removeStoresNamed = Effect.fn("AdminTest.removeStoresNamed")(function* (
  names: readonly string[]
) {
  const db = yield* Database;
  const removeStores = db.delete(stores).where(inArray(stores.name, names));
  yield* Effect.addFinalizer(() => Effect.orDie(removeStores));
});

type Call = readonly [
  "DELETE" | "GET" | "POST",
  string,
  Option.Option<unknown>,
];

const adminOnly = [
  ["POST", "/stores", Option.some({ name: "Refused store" })],
  ["GET", "/admin/admins", Option.none()],
  ["POST", "/admin/admins", Option.some({ email: "someone@example.com" })],
  ["DELETE", "/admin/admins/someone", Option.none()],
] satisfies ReadonlyArray<Call>;

const signedInOnly = [
  ...adminOnly,
  ["GET", "/admin/session", Option.none()],
] satisfies ReadonlyArray<Call>;

layer(Layer.merge(TestApp.layer, Database.layer))((it) => {
  it.effect("refuses signed-out requests with 401", () =>
    Effect.gen(function* () {
      for (const [method, path, body] of signedInOnly) {
        assert.deepStrictEqual(
          yield* refusal(yield* call(method, path, "", body)),
          [401, "Unauthorized"],
          `${method} ${path}`
        );
      }
    })
  );

  it.effect("tells a member its role and refuses it admin actions", () =>
    Effect.gen(function* () {
      const [memberEmail = ""] = yield* testEmails(["member"]);
      const member = yield* signUp(memberEmail);

      const session = yield* call("GET", "/admin/session", member.cookie);
      assert.deepStrictEqual(yield* decodeJson(RoleResponse, session), {
        role: "member",
      });
      for (const [method, path, body] of adminOnly) {
        assert.deepStrictEqual(
          yield* refusal(yield* call(method, path, member.cookie, body)),
          [403, "Forbidden"],
          `${method} ${path}`
        );
      }
    })
  );

  it.effect(
    "lets the superadmin appoint and remove an admin who creates stores",
    () =>
      Effect.gen(function* () {
        const [candidateEmail = ""] = yield* testEmails(["candidate"]);
        const storeName = `Corner Shop ${candidateEmail}`;
        yield* removeStoresNamed([storeName]);
        const superadmin = yield* signUp(testSuperadminEmail);
        const candidate = yield* signUp(candidateEmail);
        const expectedAdmin = {
          email: candidateEmail,
          name: "Test Account",
          userId: candidate.userId,
        };

        const superSession = yield* call(
          "GET",
          "/admin/session",
          superadmin.cookie
        );
        assert.deepStrictEqual(yield* decodeJson(RoleResponse, superSession), {
          role: "superadmin",
        });

        assert.deepStrictEqual(
          yield* refusal(
            yield* call(
              "POST",
              "/admin/admins",
              superadmin.cookie,
              Option.some({ email: "nobody-here@example.com" })
            )
          ),
          [404, "AccountNotFound"]
        );

        // Appointing twice answers the same admin both times.
        for (const email of [candidateEmail, candidateEmail.toUpperCase()]) {
          const appointed = yield* call(
            "POST",
            "/admin/admins",
            superadmin.cookie,
            Option.some({ email })
          );
          assert.strictEqual(appointed.status, 200);
          assert.deepStrictEqual(
            yield* decodeJson(AdminResponse, appointed),
            expectedAdmin
          );
        }
        const listed = yield* decodeJson(
          AdminsResponse,
          yield* call("GET", "/admin/admins", superadmin.cookie)
        );
        assert.deepInclude(listed, expectedAdmin);

        const adminSession = yield* call(
          "GET",
          "/admin/session",
          candidate.cookie
        );
        assert.deepStrictEqual(yield* decodeJson(RoleResponse, adminSession), {
          role: "admin",
        });
        // Admins create stores but don't manage admins.
        assert.deepStrictEqual(
          yield* refusal(yield* call("GET", "/admin/admins", candidate.cookie)),
          [403, "Forbidden"]
        );

        const created = yield* call(
          "POST",
          "/stores",
          candidate.cookie,
          Option.some({ name: `  ${storeName}  ` })
        );
        assert.strictEqual(created.status, 201);
        const store = yield* decodeJson(StoreResponse, created);
        assert.strictEqual(store.name, storeName);
        assert.match(store.id, /^store_[0-7][0-9a-hjkmnp-tv-z]{25}$/u);

        assert.deepStrictEqual(
          yield* refusal(
            yield* call(
              "POST",
              "/stores",
              candidate.cookie,
              Option.some({ name: storeName })
            )
          ),
          [409, "StoreNameTaken"]
        );

        const removed = yield* call(
          "DELETE",
          `/admin/admins/${candidate.userId}`,
          superadmin.cookie
        );
        assert.strictEqual(removed.status, 204);
        const afterRemoval = yield* decodeJson(
          AdminsResponse,
          yield* call("GET", "/admin/admins", superadmin.cookie)
        );
        assert.notDeepInclude(afterRemoval, expectedAdmin);
        assert.deepStrictEqual(
          yield* refusal(
            yield* call(
              "POST",
              "/stores",
              candidate.cookie,
              Option.some({ name: `${storeName} again` })
            )
          ),
          [403, "Forbidden"]
        );
      })
  );
});
