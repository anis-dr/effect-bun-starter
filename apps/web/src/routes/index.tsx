import { createFileRoute, redirect } from "@tanstack/react-router";
import { Effect } from "effect";

import { getEntryLocale } from "#lib/locale-preference";

// Only the locale-less entry negotiates; an explicit `/$locale` is never
// overridden. The answer depends on the cookie and `Accept-Language`, so a
// shared cache must key on both.
export const Route = createFileRoute("/")({
  beforeLoad: () =>
    Effect.runPromise(
      Effect.promise(() => getEntryLocale()).pipe(
        Effect.map((locale) =>
          redirect({
            headers: { Vary: "Accept-Language, Cookie" },
            params: { locale },
            replace: true,
            throw: true,
            to: "/$locale",
          })
        ),
        Effect.asVoid
      )
    ),
});
