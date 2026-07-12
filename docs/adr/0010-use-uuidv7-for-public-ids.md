# Use UUIDv7 for Public Database IDs

Effect Bun Starter uses UUIDv7 for public entity identifiers stored in PostgreSQL native `uuid` columns. UUIDv7 keeps IDs opaque and globally unique while preserving time locality, so B-tree indexes behave better than random UUIDv4. ULID is not the default because PostgreSQL has no native ULID type, so it usually becomes larger text storage or custom binary encoding.

Local and target PostgreSQL deployments use PostgreSQL 18+, which provides `uuidv7()`. Tables should default public UUID primary keys with database-generated `uuidv7()` unless a write path needs to precompute IDs before insert.
