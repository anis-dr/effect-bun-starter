import { Api } from "@effect-bun-starter/domain";
import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { Effect, Option } from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";

import { apiBaseUrl } from "./api-client";

/**
 * Route data read on the server, so a refresh renders the real page instead
 * of spinners. Each call forwards the visitor's cookie to the API (the
 * credentials the browser would send) and runs during SSR and on client
 * navigations alike (TanStack Start server functions).
 */

// Server-only: the client bundle gets a stub, so the server request API never
// reaches the browser build.
const requestCookie = createServerOnlyFn(() =>
  Option.fromUndefinedOr(getRequestHeader("cookie"))
);

export const withCookie = (request: HttpClientRequest.HttpClientRequest) =>
  Option.match(requestCookie(), {
    onNone: () => request,
    onSome: (cookie) => HttpClientRequest.setHeader(request, "cookie", cookie),
  });

/** The typed API client for server functions, carrying the visitor's
 * cookie: `api.pipe(Effect.flatMap((client) => client.stores.list()))`. */
export const api = HttpApiClient.make(Api, {
  baseUrl: apiBaseUrl,
  transformClient: HttpClient.mapRequest(withCookie),
}).pipe(Effect.provide(FetchHttpClient.layer));
