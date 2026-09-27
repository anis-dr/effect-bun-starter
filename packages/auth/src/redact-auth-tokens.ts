/**
 * `url` (a URL, a path or a bare query string) with Better Auth's link
 * credentials hidden, for logs and traces: the reset link carries its token
 * as a path segment (`/reset-password/<token>`), the verification link and
 * the reset page as `token=`. Anyone reading them could use the link.
 *
 * The query is what follows the first `?`, or the whole string when there is
 * none (a bare query string), up to the fragment. Each parameter's name is
 * read the way the server reads it (`%74oken=` is `token`).
 */
export const redactAuthTokens = (url: string) =>
  url.replace(/(\/reset-password\/)[^/?#]+/u, "$1:token").replace(
    /^([^?#]*\?|)([^#]*)/u,
    (_, path: string, query: string) =>
      path +
      query
        .split("&")
        .map((parameter) => {
          if (new URLSearchParams(parameter).has("token")) {
            return parameter.replace(/=.*/su, "=REDACTED");
          }
          return parameter;
        })
        .join("&")
  );
