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

export const Group = HttpApiGroup.make("stores").add(
  HttpApiEndpoint.get("list", "/stores", {
    error: HttpApiSchema.status(503)(StoresUnavailable),
    success: StoresResponse,
  })
);
