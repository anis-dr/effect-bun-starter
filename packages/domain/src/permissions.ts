import { Effect, Schema } from "effect";
import { createPermix as createPermixCore, type Rules } from "permix";
import { createPermix } from "permix/effect";

import { Forbidden } from "./api/errors.js";

/** `superadmin`: the account whose email is `SUPERADMIN_EMAIL`. `admin`: an
 * account the superadmin appointed. `member`: every other signed-in account. */
export const Role = Schema.Literals(["member", "admin", "superadmin"]);
export type Role = typeof Role.Type;

/** What a role may do, by resource and action (ADR 0012). */
// A type alias, not an interface: Permix needs the implicit index signature.
export type Permissions = {
  admin: ["list", "appoint", "remove"];
  store: ["create"];
};

export const permix = createPermix<Permissions>({
  id: "@effect-bun-starter/domain/Permix",
});

const rolePermissions = {
  admin: {
    admin: { appoint: false, list: false, remove: false },
    store: { create: true },
  },
  member: {
    admin: { appoint: false, list: false, remove: false },
    store: { create: false },
  },
  superadmin: {
    admin: { appoint: true, list: true, remove: true },
    store: { create: true },
  },
} satisfies Record<Role, Rules<Permissions>>;

/** A fresh Permix holding `role`'s rules, provided per request as
 * `permix.Tag`. */
export const makePermix = (role: Role) =>
  createPermixCore<Permissions>(rolePermissions[role]);

/** Fails with `Forbidden` (403) unless the request's role may take `action`. */
export const allow = (action: typeof permix.$inferPath) =>
  permix.check(action).pipe(
    Effect.orDie,
    Effect.filterOrFail(
      (allowed) => allowed,
      () => new Forbidden({ message: "Not allowed" })
    )
  );
