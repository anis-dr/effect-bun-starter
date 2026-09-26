import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { Schema } from "effect";

// ponytail: any fixed origin works: a path is same-site when resolving it
// against this origin keeps the origin.
const origin = "https://app.invalid";

/**
 * A path on this site, safe to redirect to after signing in. It must start
 * with one `/` and resolve to this origin. Control characters and `\` are
 * rejected outright: URL parsing drops tabs and newlines and reads `\` as `/`,
 * so `/\t/evil.example` would otherwise become `//evil.example`.
 */
export const SitePath = Schema.String.check(
  Schema.makeFilter(
    (path) =>
      path.startsWith("/") &&
      !/[\p{Cc}\\]/u.test(path) &&
      new URL(path, origin).origin === origin
  )
);

/** `path` as it may go in a `Location` header: non-ASCII percent-encoded
 * (a raw "/fr/search?q=thé" makes the server answer 500). */
export const encodedSitePath = (path: typeof SitePath.Type) => {
  const url = new URL(path, origin);
  return `${url.pathname}${url.search}${url.hash}`;
};

/** This site's origin, for absolute links in the head (canonical, language
 * versions) and links the API mails out. */
export const siteOrigin = createIsomorphicFn()
  .server(() => getRequestUrl({ xForwardedHost: true }).origin)
  .client(() => window.location.origin);
