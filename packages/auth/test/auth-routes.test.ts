import { expect, it } from "@effect/vitest";
import { HttpRouter } from "effect/unstable/http";

import { makeAuthRoutes } from "../src/auth-routes.js";

it("routes auth requests to the web handler", async () => {
  const app = HttpRouter.toWebHandler(
    makeAuthRoutes((request) =>
      Promise.resolve(
        Response.json({
          method: request.method,
          pathname: new URL(request.url).pathname,
        })
      )
    ),
    { disableLogger: true }
  );

  try {
    const response = await app.handler(
      new Request("http://localhost:3000/api/auth/session", {
        method: "POST",
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      method: "POST",
      pathname: "/api/auth/session",
    });
  } finally {
    await app.dispose();
  }
});
