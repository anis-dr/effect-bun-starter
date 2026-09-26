import { type AnyColumn, type SQL, sql } from "drizzle-orm";

// Both sides of every comparison go through `public.search_text` (custom
// migration `search_text`, ADR 0017), which removes accents and lower-cases.
// The typed text is a value, never a pattern, so it needs no escaping.

/** `column` contains the typed text. For identifiers such as emails, where a
 * near miss is another account, not a typo. */
export const containsSearch = (column: AnyColumn, search: string): SQL =>
  sql`strpos(public.search_text(${column}), public.search_text(${search})) > 0`;

/** `column` contains the typed text, or a part of it is close enough (pg_trgm
 * `<%`, threshold `pg_trgm.word_similarity_threshold`, set to 0.5 per
 * database by the `search_text` migration) that a typo still finds the name.
 * The substring half keeps one- and two-letter queries working, which
 * trigrams cannot match. */
export const matchesSearch = (column: AnyColumn, search: string): SQL =>
  sql`(public.search_text(${search}) <% public.search_text(${column}) or ${containsSearch(column, search)})`;

/** How far the typed text is from the closest part of `column` (pg_trgm
 * `<<->`): 0 is a perfect match. Order by it, ascending, to rank matches. */
export const rankSearch = (column: AnyColumn, search: string): SQL =>
  sql`public.search_text(${search}) <<-> public.search_text(${column})`;
