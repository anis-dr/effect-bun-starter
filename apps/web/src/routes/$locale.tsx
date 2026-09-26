import { createFileRoute, notFound } from "@tanstack/react-router";
import { Option } from "effect";

import { isLocale } from "../i18n";

// The one place a path's locale is parsed: pages read the typed
// `locale` from the route context.
export const Route = createFileRoute("/$locale")({
  beforeLoad: ({ params }) => ({
    locale: Option.getOrThrowWith(
      Option.liftPredicate(params.locale, isLocale),
      () => notFound()
    ),
  }),
});
