import { Config, Effect, Redacted, Schema } from "effect";

export class InvalidAuthConfig extends Schema.TaggedErrorClass<InvalidAuthConfig>()(
  "InvalidAuthConfig",
  {
    message: Schema.String,
  }
) {}

const authSecretConfig = Config.redacted("BETTER_AUTH_SECRET").pipe(
  Config.map(Redacted.value)
);

const baseURLConfig = Config.url("BETTER_AUTH_URL").pipe(Config.map(String));

export const loadAuthConfig = Effect.gen(function* loadAuthConfig() {
  const [baseURL, secret] = yield* Config.all([
    baseURLConfig,
    authSecretConfig,
  ]);

  if (secret.length < 32) {
    return yield* new InvalidAuthConfig({
      message: "BETTER_AUTH_SECRET must be at least 32 characters",
    });
  }

  return { baseURL, secret };
});
