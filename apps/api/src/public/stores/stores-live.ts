import { Database, stores } from "@effect-bun-starter/database";
import { DomainApi, StoresUnavailable } from "@effect-bun-starter/domain";
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

export const StoresLive = HttpApiBuilder.group(
  DomainApi,
  "stores",
  (handlers) =>
    handlers.handle("list", () =>
      Effect.gen(function* listStores() {
        const db = yield* Database;

        return yield* db
          .select({
            id: stores.id,
            name: stores.name,
          })
          .from(stores)
          .pipe(
            Effect.mapError(
              () => new StoresUnavailable({ message: "Stores unavailable" })
            )
          );
      }).pipe(
        Effect.withSpan("stores.list", {
          attributes: {
            "http.route": "/stores",
          },
        })
      )
    )
);
