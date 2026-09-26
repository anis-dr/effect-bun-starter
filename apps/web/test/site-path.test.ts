import { expect, it } from "@effect/vitest";
import { Option, Schema } from "effect";

import { encodedSitePath, SitePath } from "../src/lib/site-path.js";

const decode = Schema.decodeUnknownOption(SitePath);

it("accepts paths on this site", () => {
  for (const path of ["/", "/en/account", "/fr/sign-in?mode=signUp#top"]) {
    expect(decode(path)).toStrictEqual(Option.some(path));
  }
});

it("rejects paths that leave the site once the URL is parsed", () => {
  // The search params arrive decoded: `%2F%09%2Fevil.example` is `/\t/evil.example`.
  for (const path of [
    "//evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "/\r/evil.example",
    "/\\evil.example",
    "https://evil.example",
    "javascript:alert(1)",
    "evil.example",
  ]) {
    expect(decode(path)).toStrictEqual(Option.none());
  }
});

it("rejects paths whose dot segments normalize to another host", () => {
  for (const path of ["/en/..//evil.example", "/en/%2e%2e//evil.example"]) {
    expect(decode(path)).toStrictEqual(Option.none());
  }
});

it("rejects a path the URL parser cannot read instead of throwing", () => {
  expect(decode("///[")).toStrictEqual(Option.none());
});

it("percent-encodes a path for a Location header", () => {
  expect(encodedSitePath("/fr/search?q=thé vert#top")).toBe(
    "/fr/search?q=th%C3%A9%20vert#top"
  );
  expect(encodedSitePath("/en/account?tab=avatar")).toBe(
    "/en/account?tab=avatar"
  );
});
