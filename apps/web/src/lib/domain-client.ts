import { DomainApi } from "@effect-bun-starter/domain";
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

export class DomainClient extends AtomHttpApi.Service<DomainClient>()(
  "DomainClient",
  {
    api: DomainApi,
    baseUrl: apiUrl,
    httpClient: FetchHttpClient.layer,
  }
) {}
