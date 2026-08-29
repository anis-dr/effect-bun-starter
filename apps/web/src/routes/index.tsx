import { AppShell } from "@astryxdesign/core/AppShell";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useAtom, useAtomValue } from "@effect/atom-react";
import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { Effect, Option } from "effect";
import { AsyncResult, AtomRegistry } from "effect/unstable/reactivity";

import { ApiClient } from "#lib/api-client";

const healthAtom = ApiClient.query("system", "health", {
  reactivityKeys: ["system"],
});
const pingAtom = ApiClient.mutation("system", "ping");

const loadServerHealth = () => {
  const registry = AtomRegistry.make();
  const disposeRegistry = Effect.sync(function disposeRegistry() {
    registry.dispose();
  });
  const health = AtomRegistry.getResult(registry, healthAtom, {
    suspendOnWaiting: true,
  }).pipe(
    Effect.ensuring(disposeRegistry),
    Effect.map((serverHealth) => ({ serverHealth }))
  );

  return Effect.runPromise(health);
};

const Home = () => {
  const { serverHealth } = useLoaderData({ from: "/" });
  const healthResult = useAtomValue(healthAtom);
  const [pingResult, ping] = useAtom(pingAtom);

  const handlePing = () => {
    ping({});
  };

  const status = AsyncResult.builder(healthResult)
    .onInitialOrWaiting(() => "API checking")
    .onFailure(() => "API unavailable")
    .onSuccess((health) => `API ${health.status}`)
    .render();

  const pingMessage = AsyncResult.builder(pingResult)
    .onInitial(() => Option.none<string>())
    .onWaiting(() => Option.some("Pinging..."))
    .onFailure(() => Option.some("Ping failed"))
    .onSuccess((result) => Option.some(result.message))
    .render();
  const renderedPingMessage = Option.isSome(pingMessage) && (
    <Text color="secondary" type="supporting">
      {pingMessage.value}
    </Text>
  );

  return (
    <AppShell contentPadding={6}>
      <VStack gap={4} maxWidth={720}>
        <Text color="secondary" type="label">
          {status}
        </Text>
        <Heading level={1} textWrap="balance" type="display-2">
          Effect Bun Starter Web
        </Heading>
        <Text type="large">Typed client connected through Effect Atom.</Text>
        <Text color="secondary" type="supporting">
          Loader API {serverHealth.status}
        </Text>
        <HStack align="center" gap={3} wrap="wrap">
          <Button clickAction={handlePing} label="Ping API" variant="primary">
            Ping API
          </Button>
          {renderedPingMessage}
        </HStack>
      </VStack>
    </AppShell>
  );
};

export const Route = createFileRoute("/")({
  component: Home,
  loader: loadServerHealth,
});
