import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from "effect/unstable/httpapi";

import { StoreId } from "../entity-ids.js";

export class StoresUnavailable extends Schema.TaggedError<StoresUnavailable>()(
  "StoresUnavailable",
  {
    message: Schema.String,
  }
) {}

export const StoreResponse = Schema.Struct({
  id: StoreId,
  name: Schema.String,
});

export const StoresResponse = Schema.Array(StoreResponse);

/** `q`: the search box's text; blank lists every store. */
export const StoresQuery = Schema.Struct({
  q: Schema.optional(Schema.Trim.check(Schema.isMaxLength(100))),
});

export const Group = HttpApiGroup.make("stores").add(
  HttpApiEndpoint.get("list", "/stores", {
    query: StoresQuery,
    error: HttpApiSchema.status(503)(StoresUnavailable),
    success: StoresResponse,
  })
);
