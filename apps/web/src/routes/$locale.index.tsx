import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { List, ListItem } from "@astryxdesign/core/List";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { StoresQuery, type StoresResponse } from "@effect-bun-starter/domain";
import { useAtom } from "@effect/atom-react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Array as Arr, Effect, Match, Option, Schema } from "effect";
import { Atom } from "effect/unstable/reactivity";
import { Search } from "lucide-react";

import { SiteShell } from "#components/site-shell";
import { inputAttributes } from "#lib/form";
import { api } from "#lib/server-api";

import { type Copy, fill, type Locale, messages } from "../i18n";

/** `?q=`: the search box's text, trimmed; blank or too long reads as no
 * search. */
const decodeQuery = Schema.decodeUnknownOption(StoresQuery.fields.q);
const HomeSearch = Schema.Struct({ q: Schema.optional(Schema.String) });

/** What the page shows: the stores the search found, or that the API
 * couldn't answer. */
type StoreListing =
  | { readonly status: "ok"; readonly stores: typeof StoresResponse.Type }
  | { readonly status: "unavailable" };

/**
 * The store list for this search, read on the server (ADR 0016: a public
 * page renders its content in the first HTML). An API that can't answer
 * reads as unavailable rather than breaking the page.
 */
const getStores = createServerFn()
  .validator(Schema.decodeUnknownSync(HomeSearch))
  .handler(({ data }) =>
    Effect.runPromise(
      api.pipe(
        Effect.flatMap((client) => client.stores.list({ query: data })),
        Effect.map((stores): StoreListing => ({ status: "ok", stores })),
        Effect.orElseSucceed((): StoreListing => ({ status: "unavailable" }))
      )
    )
  );

/** What is typed, seeded per shown search: back or forward to another search
 * shows its text, and the box stays mounted, so focus stays in it. */
const draftAtom = Atom.family((query: string) => Atom.make(query));

/** A plain GET form, so it searches before hydration too; after it, the
 * router navigates in place and focus stays in the box. */
const SearchBox = ({
  copy,
  locale,
  query,
}: {
  readonly copy: Copy;
  readonly locale: Locale;
  readonly query: Option.Option<string>;
}) => {
  const navigate = Route.useNavigate();
  const seed = Option.getOrElse(query, () => "");
  const [draft, setDraft] = useAtom(draftAtom(seed));
  // Blank searches list everything, with no `?q=`.
  const search = Option.match(
    Option.liftPredicate(draft.trim(), (text) => text !== ""),
    { onNone: () => ({}), onSome: (q) => ({ q }) }
  );
  return (
    <search>
      <form
        action={`/${locale}`}
        method="get"
        onSubmit={(event) => {
          event.preventDefault();
          // The search left behind goes back to its own text, for a later
          // back navigation.
          const resetDraft = Effect.sync(() => {
            setDraft(seed);
          });
          void Effect.runPromise(
            Effect.promise(() => navigate({ search })).pipe(
              Effect.andThen(resetDraft)
            )
          );
        }}
      >
        <HStack align="end" gap={2}>
          <StackItem size="fill">
            <TextInput
              htmlName="q"
              label={copy.searchLabel}
              onChange={setDraft}
              placeholder={copy.searchPlaceholder}
              ref={inputAttributes({
                autocomplete: "off",
                dir: "auto",
                enterkeyhint: "search",
                spellcheck: "false",
              })}
              value={draft}
              width="100%"
            />
          </StackItem>
          <Button
            icon={<Search aria-hidden size="1em" />}
            label={copy.searchAction}
            type="submit"
            variant="primary"
          />
        </HStack>
      </form>
    </search>
  );
};

const StoreList = ({
  copy,
  locale,
  query,
  stores,
}: {
  readonly copy: Copy;
  readonly locale: Locale;
  readonly query: Option.Option<string>;
  readonly stores: typeof StoresResponse.Type;
}) =>
  Option.match(
    Arr.match(stores, { onEmpty: Option.none, onNonEmpty: Option.some }),
    {
      onNone: () =>
        Option.match(query, {
          onNone: () => (
            <EmptyState
              description={copy.storesEmptyDescription}
              title={copy.storesEmptyTitle}
            />
          ),
          onSome: (q) => (
            <EmptyState
              actions={
                <Button
                  href={`/${locale}`}
                  label={copy.clearSearch}
                  variant="secondary"
                />
              }
              description={copy.storesNoMatchDescription}
              title={fill(copy.storesNoMatchTitle, { q })}
            />
          ),
        }),
      onSome: (found) => (
        <List
          hasDividers
          header={
            <Heading level={2}>
              {Option.match(query, {
                onNone: () => copy.allStores,
                onSome: (q) => fill(copy.storesMatching, { q }),
              })}
            </Heading>
          }
        >
          {found.map((store) => (
            <ListItem key={store.id} label={store.name} />
          ))}
        </List>
      ),
    }
  );

const Home = () => {
  const { locale } = Route.useRouteContext();
  const { q } = Route.useSearch();
  const stores = Route.useLoaderData();
  const copy = messages[locale];
  const query = Option.fromUndefinedOr(q);

  return (
    <SiteShell locale={locale}>
      <VStack gap={6} maxWidth="45rem">
        <VStack gap={2}>
          <Heading level={1} textWrap="balance">
            {copy.homeHeading}
          </Heading>
          <Text as="p" color="secondary" textWrap="pretty">
            {copy.homeLead}
          </Text>
        </VStack>
        <SearchBox copy={copy} locale={locale} query={query} />
        {Match.value(stores).pipe(
          Match.when({ status: "ok" }, ({ stores: listed }) => (
            <StoreList
              copy={copy}
              locale={locale}
              query={query}
              stores={listed}
            />
          )),
          Match.orElse(() => (
            <Banner status="error" title={copy.storesUnavailable} />
          ))
        )}
      </VStack>
    </SiteShell>
  );
};

export const Route = createFileRoute("/$locale/")({
  component: Home,
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ deps }) => getStores({ data: deps }),
  validateSearch: (search: {
    readonly q?: unknown;
  }): typeof HomeSearch.Type => ({
    q: Option.getOrUndefined(
      Option.filter(
        Option.flatMap(decodeQuery(search.q), Option.fromUndefinedOr),
        (text) => text !== ""
      )
    ),
  }),
});
