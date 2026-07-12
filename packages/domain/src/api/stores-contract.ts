import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from "effect/unstable/httpapi";

export class StoresUnavailable extends Schema.TaggedErrorClass<StoresUnavailable>()(
  "StoresUnavailable",
  {
    message: Schema.String,
  }
) {}

export const StoreResponse = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});

export const StoresResponse = Schema.Array(StoreResponse);

export const Group = HttpApiGroup.make("stores").add(
  HttpApiEndpoint.get("list", "/stores", {
    error: HttpApiSchema.status(503)(StoresUnavailable),
    success: StoresResponse,
  })
);
