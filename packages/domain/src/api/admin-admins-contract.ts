import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from "effect/unstable/httpapi";

import { Authentication } from "./authentication.js";
import { Forbidden } from "./errors.js";

export class AccountNotFound extends Schema.TaggedError<AccountNotFound>()(
  "AccountNotFound",
  { message: Schema.String }
) {}

export class AdminUnavailable extends Schema.TaggedError<AdminUnavailable>()(
  "AdminUnavailable",
  { message: Schema.String }
) {}

/** An appointed admin. The superadmin is named by configuration, not listed. */
export const AdminResponse = Schema.Struct({
  email: Schema.String,
  name: Schema.String,
  userId: Schema.String,
});

export const AppointAdminRequest = Schema.Struct({
  email: Schema.Trim.check(
    Schema.isNonEmpty(),
    Schema.isMaxLength(320),
    Schema.isPattern(/^[^\s@]+@[^\s@]+$/u)
  ),
});

const ForbiddenResponse = HttpApiSchema.status(403)(Forbidden);
const UnavailableResponse = HttpApiSchema.status(503)(AdminUnavailable);

export const Group = HttpApiGroup.make("adminAdmins")
  .add(
    HttpApiEndpoint.get("list", "/admin/admins", {
      error: [ForbiddenResponse, UnavailableResponse],
      success: Schema.Array(AdminResponse),
    })
  )
  .add(
    /** Appointing an admin again answers the same admin. */
    HttpApiEndpoint.post("appoint", "/admin/admins", {
      error: [
        ForbiddenResponse,
        HttpApiSchema.status(404)(AccountNotFound),
        UnavailableResponse,
      ],
      payload: AppointAdminRequest,
      success: AdminResponse,
    })
  )
  .add(
    /** Removing an account that is not an admin changes nothing. */
    HttpApiEndpoint.delete("remove", "/admin/admins/:userId", {
      error: [ForbiddenResponse, UnavailableResponse],
      params: { userId: Schema.String },
      success: HttpApiSchema.NoContent,
    })
  )
  .middleware(Authentication);
