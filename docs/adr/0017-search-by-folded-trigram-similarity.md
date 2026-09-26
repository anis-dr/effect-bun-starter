# Search by Folded Trigram Similarity in PostgreSQL

Every search box matches what was typed with `matchesSearch` from `@effect-bun-starter/database`, unless there is a good reason not to. That reason goes in a comment where the search is built.

**How a match works.** Both the column and the typed text go through `public.search_text`, which removes accents (`unaccent`) and lower-cases the result. A row matches when any part of the name is close to the query by trigram word similarity (pg_trgm `<%`, threshold `pg_trgm.word_similarity_threshold`, set to 0.5 for the database by a migration), so a typo still finds it. It also matches when the name simply contains the query, which keeps one- and two-letter queries working. Rank results with `rankSearch` (pg_trgm `<<->`, 0 is a perfect match) when order matters. The typed text is always a value, never a LIKE pattern, so nothing is escaped by hand.

**Where the parts live.** The `search_text` migration creates the `pg_trgm` and `unaccent` extensions, the IMMUTABLE `search_text` function and the threshold, so every database (dev, tests, CI, production) gets them from code. `compose.yaml` pins what that needs from the server: a glibc Postgres image and a UTF-8 locale at `initdb`. pg_trgm only treats accented letters as word characters under a UTF-8 `LC_CTYPE`; under `C` it drops them. Searched columns that can grow large get a GIN index on `public.search_text(column) gin_trgm_ops` (`stores_name_search_idx`); only the operator form uses it.

**Other scripts.** `search_text` folds Latin accents only. A project whose names use another script (vowel marks, letter variants, compatibility forms) adds that folding inside `search_text`, where the migration's comment marks the spot, and rebuilds the indexes built on it.

**Known exceptions.**

- Identifiers such as emails use `containsSearch` (folded substring only): a near miss there is another account, not a typo.
- Long text, such as descriptions, may use full-text search when a feature needs it.
- Transliteration between scripts is not handled.

We chose this because it tolerates typos and accents, needs only extensions available on every managed PostgreSQL 18 host, and keeps search in the one database, with no second store to sync. The costs:

- A threshold to tune. The default 0.6 misses common one-letter typos; 0.5 finds them without matching unrelated names. Lower values only suit results ordered by match quality (`rankSearch`).
- One-letter queries rely on the substring half, which a trigram index cannot speed up.
