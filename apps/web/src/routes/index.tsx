import { Button } from "@effect-bun-starter/ui/components/button";
import { useAtom, useAtomValue } from "@effect/atom-react";
import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { Effect } from "effect";
import { AsyncResult, AtomRegistry } from "effect/unstable/reactivity";

import { DomainClient } from "#lib/domain-client";

const healthAtom = DomainClient.query("system", "health", {
  reactivityKeys: ["system"],
});
const pingAtom = DomainClient.mutation("system", "ping");

const loadServerHealth = () => {
  const registry = AtomRegistry.make();

  return Effect.runPromise(
    AtomRegistry.getResult(registry, healthAtom, {
      suspendOnWaiting: true,
    }).pipe(Effect.ensuring(Effect.sync(() => registry.dispose())))
  );
};

const Home = () => {
  const { serverHealth } = useLoaderData({ from: "/" });
  const healthResult = useAtomValue(healthAtom);
  const [pingResult, ping] = useAtom(pingAtom, { mode: "promise" });

  const handlePing = async () => {
    try {
      await ping({});
    } catch {
      // Ping failures are rendered from pingResult.
    }
  };

  const status = AsyncResult.builder(healthResult)
    .onInitialOrWaiting(() => "API checking")
    .onFailure(() => "API unavailable")
    .onSuccess((health) => `API ${health.status}`)
    .render();

  const pingMessage = AsyncResult.builder(pingResult)
    .onInitial(() => null)
    .onWaiting(() => "Pinging...")
    .onFailure(() => "Ping failed")
    .onSuccess((result) => result.message)
    .render();

  return (
    <div className="p-8">
      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        {status}
      </p>
      <h1 className="mt-2 text-4xl font-bold">Effect Bun Starter Web</h1>
      <p className="mt-4 text-lg">
        Typed client connected through Effect Atom.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Loader API {serverHealth.status}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button disabled={pingResult.waiting} onClick={() => void handlePing()}>
          {pingResult.waiting ? "Pinging..." : "Ping API"}
        </Button>
        {pingMessage ? (
          <p className="text-sm text-muted-foreground">{pingMessage}</p>
        ) : null}
      </div>
    </div>
  );
};

export const Route = createFileRoute("/")({
  component: Home,
  loader: async () => ({ serverHealth: await loadServerHealth() }),
});
