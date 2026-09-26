import { admins, Database, eq, user } from "@effect-bun-starter/database";
import {
  AccountNotFound,
  AdminUnavailable,
  allow,
  Api,
} from "@effect-bun-starter/domain";
import { Effect, Option } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

/** Logs a database failure and answers 503. */
const unavailable = Effect.fn("AdminAdmins.unavailable")(function* (
  cause: unknown
) {
  yield* Effect.logError("Admin dependency failed", cause);
  return yield* new AdminUnavailable({ message: "Admin unavailable" });
});

const adminFields = { email: user.email, name: user.name, userId: user.id };

export const adminAdminsLayer = HttpApiBuilder.group(
  Api,
  "adminAdmins",
  (handlers) =>
    handlers
      .handle("list", () =>
        Effect.gen(function* listAdmins() {
          yield* allow("admin.list");
          const db = yield* Database;
          return yield* db
            .select(adminFields)
            .from(admins)
            .innerJoin(user, eq(user.id, admins.userId))
            .orderBy(admins.appointedAt, admins.userId)
            .pipe(Effect.catch(unavailable));
        }).pipe(Effect.withSpan("AdminAdmins.list"))
      )
      .handle("appoint", ({ payload }) =>
        Effect.gen(function* appointAdmin() {
          yield* allow("admin.appoint");
          const db = yield* Database;
          const [account] = yield* db
            .select(adminFields)
            .from(user)
            .where(eq(user.email, payload.email.toLowerCase()))
            .pipe(Effect.catch(unavailable));
          const found = yield* Option.fromUndefinedOr(account).pipe(
            Effect.fromOption(
              () =>
                new AccountNotFound({ message: "No account has this email" })
            )
          );
          yield* db
            .insert(admins)
            .values({ userId: found.userId })
            .onConflictDoNothing()
            .pipe(Effect.catch(unavailable));
          return found;
        }).pipe(Effect.withSpan("AdminAdmins.appoint"))
      )
      .handle("remove", ({ params }) =>
        Effect.gen(function* removeAdmin() {
          yield* allow("admin.remove");
          const db = yield* Database;
          yield* db
            .delete(admins)
            .where(eq(admins.userId, params.userId))
            .pipe(Effect.catch(unavailable));
        }).pipe(Effect.withSpan("AdminAdmins.remove"))
      )
);
