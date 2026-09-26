import {
  Database,
  isUniqueViolation,
  stores,
} from "@effect-bun-starter/database";
import {
  allow,
  Api,
  StoreNameTaken,
  StoresUnavailable,
} from "@effect-bun-starter/domain";
import { Effect, Match, Option } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

const unavailable = () =>
  new StoresUnavailable({ message: "Stores unavailable" });

/** Logs a database failure and answers 503. */
const failUnavailable = Effect.fn("AdminStores.unavailable")(function* (
  cause: unknown
) {
  yield* Effect.logError("Store insert failed", cause);
  return yield* unavailable();
});

/** A failed insert: a taken name is 409, anything else is 503. */
const createFailure = <E extends { readonly cause?: unknown }>(error: E) =>
  Match.value(error).pipe(
    Match.when(
      (conflict) => isUniqueViolation(conflict, "stores_name_key"),
      () =>
        Effect.fail(
          new StoreNameTaken({ message: "Another store has this name" })
        )
    ),
    Match.orElse(failUnavailable)
  );

export const adminStoresLayer = HttpApiBuilder.group(
  Api,
  "adminStores",
  (handlers) =>
    handlers.handle("create", ({ payload }) =>
      Effect.gen(function* createStore() {
        yield* allow("store.create");
        const db = yield* Database;
        const [store] = yield* db
          .insert(stores)
          .values({ name: payload.name })
          .returning({ id: stores.id, name: stores.name })
          .pipe(Effect.catch(createFailure));
        return yield* Option.fromUndefinedOr(store).pipe(
          Effect.fromOption(unavailable)
        );
      }).pipe(Effect.withSpan("AdminStores.create"))
    )
);
