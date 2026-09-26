-- Search matches names by trigram word similarity (pg_trgm) on text folded by
-- public.search_text: accents removed (unaccent), lower case. ADR 0017.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
-- IMMUTABLE so it can be indexed: the dictionary is named explicitly and the
-- SQL-standard body binds its objects now, not through search_path.
-- A project whose names use other scripts adds its folding here, around the
-- unaccent call (for example removing vowel marks or unifying letter
-- variants), then rebuilds the indexes that use it.
CREATE FUNCTION public.search_text(value text) RETURNS text
  LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
  RETURN lower(public.unaccent('public.unaccent'::regdictionary, value));
--> statement-breakpoint
-- matchesSearch's `<%` reads pg_trgm.word_similarity_threshold. The default
-- of 0.6 misses common one-letter typos; 0.5 finds them without matching
-- unrelated names (ADR 0017). Set per database so every connection, psql
-- included, searches the same way; open connections pick it up when they
-- reconnect.
DO $$
BEGIN
  EXECUTE format(
    'ALTER DATABASE %I SET pg_trgm.word_similarity_threshold = 0.5',
    current_database()
  );
END
$$;
