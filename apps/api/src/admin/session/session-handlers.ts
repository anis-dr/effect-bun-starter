import { Api, CurrentAccount } from "@effect-bun-starter/domain";
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

export const adminSessionLayer = HttpApiBuilder.group(
  Api,
  "adminSession",
  (handlers) =>
    handlers.handle("me", () =>
      Effect.gen(function* readSession() {
        const { role } = yield* CurrentAccount;
        return { role };
      })
    )
);
