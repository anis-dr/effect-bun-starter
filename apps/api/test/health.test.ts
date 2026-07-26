import { Api } from "@effect-bun-starter/domain";
import * as BunHttpPlatform from "@effect/platform-bun/BunHttpPlatform";
import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it } from "@effect/vitest";
import { Layer } from "effect";
import { Etag, HttpRouter } from "effect/unstable/http";
import { HttpApi, HttpApiBuilder } from "effect/unstable/httpapi";

import { HealthLive } from "../src/public/system/health-live.js";

const systemGroup = Api.groups.system as Extract<
  (typeof Api.groups)[keyof typeof Api.groups],
  { readonly identifier: "system" }
>;
const PlatformLive = Layer.mergeAll(
  BunHttpPlatform.layer,
  BunServices.layer,
  Etag.layer
);
const SystemApiLive = HttpApiBuilder.layer(
  HttpApi.make("Api").add(systemGroup)
).pipe(Layer.provide(HealthLive), Layer.provide(PlatformLive));

it("serves the health response contract", async () => {
  const app = HttpRouter.toWebHandler(SystemApiLive, {
    disableLogger: true,
  });

  try {
    const response = await app.handler(new Request("http://localhost/health"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      service: "effect-bun-starter-api",
      status: "ok",
    });
  } finally {
    await app.dispose();
  }
});
