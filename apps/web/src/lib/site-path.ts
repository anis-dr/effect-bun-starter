import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { Option, Schema } from "effect";

// ponytail: any fixed origin works: a path is same-site when resolving it
// against this origin keeps the origin.
const origin = "https://app.invalid";

/**
 * A path on this site, safe to redirect to after signing in. It must start
 * with `/` and, once parsed and normalized, stay on this origin and still
 * start with exactly one `/`: a redirect emits the normalized path, and dot
 * segments turn `/en/..//evil.example` into `//evil.example`, another host.
 * Control characters and `\` are rejected outright: URL parsing drops tabs
 * and newlines and reads `\` as `/`, so `/\t/evil.example` would otherwise
 * become `//evil.example`.
 */
export const SitePath = Schema.String.check(
  Schema.makeFilter(
    (path) =>
      path.startsWith("/") &&
      !/[\p{Cc}\\]/u.test(path) &&
      Option.fromNullishOr(URL.parse(path, origin)).pipe(
        Option.exists(
          (url) => url.origin === origin && !url.pathname.startsWith("//")
        )
      )
  )
);

/** `path` as it may go in a `Location` header: normalized, non-ASCII
 * percent-encoded (a raw "/fr/search?q=thé" makes the server answer 500). */
export const encodedSitePath = (path: typeof SitePath.Type) => {
  const url = new URL(path, origin);
  return `${url.pathname}${url.search}${url.hash}`;
};

/** This site's origin, for absolute links in the head (canonical, language
 * versions) and links the API mails out. */
export const siteOrigin = createIsomorphicFn()
  .server(() => getRequestUrl({ xForwardedHost: true }).origin)
  .client(() => window.location.origin);
