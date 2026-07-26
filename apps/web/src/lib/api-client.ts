import { Api } from "@effect-bun-starter/domain";
import { Config, ConfigProvider, Effect } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { AtomHttpApi } from "effect/unstable/reactivity";

const apiBaseUrl = Config.string("VITE_API_URL").pipe(
  Config.withDefault("http://localhost:3002")
);

const apiUrl = Effect.runSync(
  apiBaseUrl.pipe(
    Effect.provide(
      ConfigProvider.layer(ConfigProvider.fromUnknown(import.meta.env))
    )
  )
);

export class ApiClient extends AtomHttpApi.Service<ApiClient>()("ApiClient", {
  api: Api,
  baseUrl: apiUrl,
  httpClient: FetchHttpClient.layer,
}) {}
