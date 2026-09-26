import { Api } from "@effect-bun-starter/domain";
import { Config, ConfigProvider, Effect, Layer } from "effect";
import { FetchHttpClient, HttpClient } from "effect/unstable/http";
import { AtomHttpApi } from "effect/unstable/reactivity";

const apiBaseUrlConfig = Config.String("VITE_API_URL").pipe(
  Config.withDefault("http://localhost:3002")
);

export const apiBaseUrl = Effect.runSync(
  apiBaseUrlConfig.pipe(
    Effect.provide(
      ConfigProvider.layer(ConfigProvider.fromUnknown(import.meta.env))
    )
  )
);

const browserHttpClientLayer = FetchHttpClient.layer.pipe(
  Layer.provide(
    Layer.merge(
      Layer.succeed(FetchHttpClient.RequestInit, {
        credentials: "include",
      }),
      // Browser OpenTelemetry owns cross-origin propagation for these fetches.
      Layer.succeed(HttpClient.TracerPropagationEnabled, false)
    )
  )
);

export class ApiClient extends AtomHttpApi.Service<ApiClient>()(
  "@effect-bun-starter/web/ApiClient",
  {
    api: Api,
    baseUrl: apiBaseUrl,
    httpClient: browserHttpClientLayer,
  }
) {}
