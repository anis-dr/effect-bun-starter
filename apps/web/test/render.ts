import { Api } from "@effect-bun-starter/domain";
import { RegistryProvider } from "@effect/atom-react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render } from "@testing-library/react";
import { Effect, Function, Layer, Option, Record as Rec } from "effect";
import { HttpClient, HttpClientResponse } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";
import { Atom, Reactivity } from "effect/unstable/reactivity";
import { createElement, type ReactElement } from "react";
import { vi } from "vitest";

import { ApiClient } from "../src/lib/api-client.js";

/** The API's answers, by `"METHOD /path"`. */
export type Routes = Readonly<Record<string, () => Response>>;

/** The app's typed API client, over an API that answers from `routes`, with
 * the `Reactivity` every atom runtime carries (mutations invalidate by key). */
const answeringLayer = (routes: Routes) =>
  Layer.effect(
    ApiClient,
    HttpApiClient.make(Api, { baseUrl: "http://api.test" })
  ).pipe(
    Layer.provide(
      Layer.succeed(
        HttpClient.HttpClient,
        HttpClient.make((request, url) =>
          Option.match(Rec.get(routes, `${request.method} ${url.pathname}`), {
            onNone: () =>
              Effect.die(`No answer for ${request.method} ${url.pathname}`),
            onSome: (answer) =>
              Effect.succeed(HttpClientResponse.fromWeb(request, answer())),
          })
        )
      )
    ),
    Layer.provideMerge(Reactivity.layer)
  );

/**
 * Renders `page` under a router, with the app's API client talking to
 * `routes`; unmounted when the test's scope closes.
 */
export const renderPage = Effect.fn("TestPage.render")(function* (
  page: ReactElement,
  routes: Routes
) {
  // jsdom has no media queries; dialogs ask whether motion is reduced.
  vi.stubGlobal("matchMedia", (media: string) => ({
    addEventListener: Function.constVoid,
    matches: false,
    media,
    removeEventListener: Function.constVoid,
  }));
  const router = createRouter({
    history: createMemoryHistory(),
    routeTree: createRootRoute({ component: () => page }),
  });
  const view = render(
    createElement(
      RegistryProvider,
      {
        initialValues: [
          Atom.initialValue(ApiClient.runtime.layer, answeringLayer(routes)),
        ],
      },
      createElement(RouterProvider, { router })
    )
  );
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      view.unmount();
      cleanup();
      vi.unstubAllGlobals();
    })
  );
});

/** What a screen reader reads after a control's name: the text of the
 * elements its `aria-describedby` names, in order. */
export const describedAs = (control: Element) =>
  (control.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter((id) => id !== "")
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");
