import {
  createRouter as createTanStackRouter,
  stringifySearchWith,
} from "@tanstack/react-router";
import { Option } from "effect";

import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const router = createTanStackRouter({
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    // Search params stay the strings the URL holds, for every route; each
    // route decodes its own. TanStack's own decoder (even through
    // `parseSearchWith`) turns `?q=2024` into a number and `true` into a
    // boolean.
    parseSearch: (search) => Object.fromEntries(new URLSearchParams(search)),
    routeTree,
    scrollRestoration: true,
    stringifySearch: stringifySearchWith((value) => value),
  });

  // A client navigation that took focus with it (a form submit, a link that
  // unmounted) hands it to the new page's heading, else its main, so a screen
  // reader hears the page change and Tab continues from there. Focus on a
  // control that stayed (header, search box) stays. Fires in the browser only.
  router.subscribe("onRendered", (event) => {
    Option.map(
      Option.fromUndefinedOr(event.fromLocation).pipe(
        Option.filter(
          () => event.pathChanged && document.activeElement === document.body
        ),
        Option.flatMap(() =>
          Option.fromNullOr(
            document.querySelector<HTMLElement>(":is(main, [role=main]) h1") ??
              document.querySelector<HTMLElement>("main, [role=main]")
          )
        )
      ),
      (target) => {
        // Focusable for script only; no ring on a non-control.
        Option.map(
          Option.liftPredicate(
            target,
            (node) => !node.hasAttribute("tabindex")
          ),
          (node) => {
            node.tabIndex = -1;
            node.style.outline = "none";
          }
        );
        target.focus({ preventScroll: true });
      }
    );
  });

  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
  /** `isPrivate`: a page for one signed-in account or for signing in. The
   * root head marks it `noindex` and gives it no canonical or language
   * versions. */
  interface StaticDataRouteOption {
    isPrivate?: boolean;
  }
}
