import { Context, Schema } from "effect";
import { HttpApiMiddleware, HttpApiSchema } from "effect/unstable/httpapi";
import type { Permix } from "permix";

import type { Permissions, Role } from "../permissions.js";
import { Unauthorized } from "./errors.js";

export class AuthenticationUnavailable extends Schema.TaggedError<AuthenticationUnavailable>()(
  "AuthenticationUnavailable",
  { message: Schema.String }
) {}

/** The signed-in account making the request. */
export class CurrentAccount extends Context.Service<
  CurrentAccount,
  { readonly role: Role; readonly userId: string }
>()("@effect-bun-starter/domain/CurrentAccount") {}

/**
 * Every signed-in endpoint: signed out is 401. Provides the account and a
 * Permix holding its role's rules, which handlers check with `allow`.
 */
export class Authentication extends HttpApiMiddleware.Service<
  Authentication,
  { provides: CurrentAccount | Permix<Permissions> }
>()("@effect-bun-starter/domain/Authentication", {
  error: [
    HttpApiSchema.status(401)(Unauthorized),
    HttpApiSchema.status(503)(AuthenticationUnavailable),
  ],
}) {}
