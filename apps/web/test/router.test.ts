import { expect, it } from "vitest";

import { getRouter } from "../src/router.js";

it("registers the home route", () => {
  const router = getRouter();

  expect(router.routesByPath["/"].fullPath).toBe("/");
});

it("keeps search params as the strings the URL holds", () => {
  const { parseSearch, stringifySearch } = getRouter().options;
  const search = { limit: "1", q: "2024", sort: "true" };

  expect(parseSearch("?q=2024&limit=1&sort=true")).toEqual(search);
  expect(parseSearch(stringifySearch(search))).toEqual(search);
});
