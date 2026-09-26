import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useAtom, useAtomValue } from "@effect/atom-react";
import { createFileRoute } from "@tanstack/react-router";
import { Effect, Option } from "effect";
import { AsyncResult, AtomRegistry } from "effect/unstable/reactivity";

import { SiteShell } from "#components/site-shell";
import { ApiClient } from "#lib/api-client";

import { fill, messages } from "../i18n";

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
  const { locale } = Route.useRouteContext();
  const copy = messages[locale];
  const { serverHealth } = Route.useLoaderData();
  const healthResult = useAtomValue(healthAtom);
  const [pingResult, ping] = useAtom(pingAtom);

  const handlePing = () => {
    ping({});
  };

  const status = AsyncResult.builder(healthResult)
    .onInitialOrWaiting(() => copy.apiChecking)
    .onFailure(() => copy.apiUnavailable)
    .onSuccess((health) => fill(copy.apiStatus, { status: health.status }))
    .render();

  const pingMessage = AsyncResult.builder(pingResult)
    .onInitial(() => Option.none<string>())
    .onWaiting(() => Option.some(copy.pinging))
    .onFailure(() => Option.some(copy.pingFailed))
    .onSuccess((result) => Option.some(result.message))
    .render();
  const renderedPingMessage = Option.isSome(pingMessage) && (
    <Text color="secondary" type="supporting">
      {pingMessage.value}
    </Text>
  );

  return (
    <SiteShell locale={locale}>
      <VStack gap={4} maxWidth="45rem">
        <Text color="secondary" type="label">
          {status}
        </Text>
        <Heading level={1} textWrap="balance" type="display-2">
          {copy.homeHeading}
        </Heading>
        <Text type="large">{copy.homeLead}</Text>
        <Text color="secondary" type="supporting">
          {fill(copy.loaderStatus, { status: serverHealth.status })}
        </Text>
        <HStack align="center" gap={3} wrap="wrap">
          <Button clickAction={handlePing} label={copy.ping} variant="primary">
            {copy.ping}
          </Button>
          {renderedPingMessage}
        </HStack>
      </VStack>
    </SiteShell>
  );
};

export const Route = createFileRoute("/$locale/")({
  component: Home,
  loader: loadServerHealth,
});
