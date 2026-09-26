import { Config, Effect, Option, Redacted, Schema } from "effect";

export class AuthConfigError extends Schema.TaggedError<AuthConfigError>()(
  "AuthConfigError",
  {
    message: Schema.String,
  }
) {}

const authSecretConfig = Config.Redacted("BETTER_AUTH_SECRET").pipe(
  Config.map(Redacted.value)
);

const baseURLConfig = Config.URL("BETTER_AUTH_URL").pipe(Config.map(String));
/** The web app's origin: trusted by better-auth and the only CORS origin. */
export const trustedOriginConfig = Config.URL(
  "BETTER_AUTH_TRUSTED_ORIGIN"
).pipe(
  Config.withDefault(new URL("http://localhost:3000")),
  Config.map((url) => url.origin)
);
/** The parent domain the API and the web app share when they run on sibling
 * subdomains (`example.com` for `api.example.com` and `app.example.com`).
 * The session cookie is then set on it, so the web server receives it and
 * renders signed-in pages. Unset: the cookie stays on the API's host, which
 * works while both run on one host (ports differ in development). */
const cookieDomainConfig = Config.option(
  Config.String("BETTER_AUTH_COOKIE_DOMAIN")
);

export const loadAuthConfig = Effect.gen(function* loadAuthConfig() {
  const [baseURL, secret, trustedOrigin, cookieDomain] = yield* Config.all([
    baseURLConfig,
    authSecretConfig,
    trustedOriginConfig,
    cookieDomainConfig,
  ]);

  if (secret.length < 32) {
    return yield* new AuthConfigError({
      message: "BETTER_AUTH_SECRET must be at least 32 characters",
    });
  }

  const base = { baseURL, secret, trustedOrigins: [trustedOrigin] };
  if (Option.isNone(cookieDomain)) {
    return { ...base, crossSubDomainCookies: { enabled: false } };
  }

  // A browser drops a cookie whose domain is not the setting host or its
  // parent, and never sends it to a host outside that domain.
  const domain = cookieDomain.value;
  for (const url of [baseURL, trustedOrigin]) {
    const host = new URL(url).hostname;
    if (host !== domain && !host.endsWith(`.${domain}`)) {
      return yield* new AuthConfigError({
        message: `BETTER_AUTH_COOKIE_DOMAIN ${domain} must be ${host} or a parent of it`,
      });
    }
  }
  return { ...base, crossSubDomainCookies: { domain, enabled: true } };
});
