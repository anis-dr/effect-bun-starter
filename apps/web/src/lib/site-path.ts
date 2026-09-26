import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";

/** This site's origin, for absolute links in the head (canonical, language
 * versions, `og:url`) and links the API mails out. */
export const siteOrigin = createIsomorphicFn()
  .server(() => getRequestUrl({ xForwardedHost: true }).origin)
  .client(() => window.location.origin);
