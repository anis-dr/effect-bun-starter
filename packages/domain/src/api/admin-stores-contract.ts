import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from "effect/unstable/httpapi";

import { Authentication } from "./authentication.js";
import { Forbidden } from "./errors.js";
import { StoreResponse, StoresUnavailable } from "./stores-contract.js";

export class StoreNameTaken extends Schema.TaggedError<StoreNameTaken>()(
  "StoreNameTaken",
  { message: Schema.String }
) {}

export const CreateStoreRequest = Schema.Struct({
  name: Schema.Trim.check(Schema.isNonEmpty(), Schema.isMaxLength(80)),
});

export const Group = HttpApiGroup.make("adminStores")
  .add(
    HttpApiEndpoint.post("create", "/stores", {
      error: [
        HttpApiSchema.status(403)(Forbidden),
        HttpApiSchema.status(409)(StoreNameTaken),
        HttpApiSchema.status(503)(StoresUnavailable),
      ],
      payload: CreateStoreRequest,
      success: HttpApiSchema.status(201)(StoreResponse),
    })
  )
  .middleware(Authentication);
