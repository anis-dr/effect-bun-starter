import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import { Role } from "../permissions.js";
import { Authentication } from "./authentication.js";

/** The signed-in account's role, for showing or hiding the admin area. */
export const AdminSessionResponse = Schema.Struct({ role: Role });

export const Group = HttpApiGroup.make("adminSession")
  .add(
    HttpApiEndpoint.get("me", "/admin/session", {
      success: AdminSessionResponse,
    })
  )
  .middleware(Authentication);
