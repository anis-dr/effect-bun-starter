import { expect, it } from "vitest";

import { getRouter } from "../src/router.js";

it("registers the home route", () => {
  const router = getRouter();

  expect(router.routesByPath["/"].fullPath).toBe("/");
});
