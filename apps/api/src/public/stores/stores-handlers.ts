import {
  Database,
  asc,
  matchesSearch,
  rankSearch,
  stores,
} from "@effect-bun-starter/database";
import { Api, StoresUnavailable } from "@effect-bun-starter/domain";
import { Effect, Option } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

export const storesLayer = HttpApiBuilder.group(Api, "stores", (handlers) =>
  handlers.handle("list", ({ query }) =>
    Effect.gen(function* listStores() {
      const db = yield* Database;
      const search = Option.fromUndefinedOr(query.q).pipe(
        Option.filter((text) => text.length > 0)
      );

      return yield* db
        .select({
          id: stores.id,
          name: stores.name,
        })
        .from(stores)
        .where(
          Option.getOrUndefined(
            Option.map(search, (text) => matchesSearch(stores.name, text))
          )
        )
        .orderBy(
          ...Option.toArray(
            Option.map(search, (text) => rankSearch(stores.name, text))
          ),
          asc(stores.name)
        )
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
