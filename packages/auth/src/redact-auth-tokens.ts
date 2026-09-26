/**
 * `url` (a URL, a path or a bare query string) with Better Auth's link
 * credentials hidden, for logs and traces: the reset link carries its token
 * as a path segment (`/reset-password/<token>`), the verification link and
 * the reset page as `token=`. Anyone reading them could use the link.
 */
export const redactAuthTokens = (url: string) =>
  url
    .replace(/(\/reset-password\/)[^/?#]+/u, "$1:token")
    .replace(/(^|[?&])token=[^&#]*/gu, "$1token=REDACTED");
