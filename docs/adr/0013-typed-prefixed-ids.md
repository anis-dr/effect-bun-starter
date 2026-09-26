# Use Typed, Prefixed IDs at the API Edge

Extends [0010](0010-use-uuidv7-for-public-ids.md). PostgreSQL still stores entity IDs in native `uuid` columns defaulting to `uuidv7()`. The API sends and receives them as [TypeIDs](https://github.com/jetify-com/typeid/tree/main/spec): `<prefix>_<26 lowercase Crockford base32 chars>`, such as `store_01h455vb4pex5vsknk084sn02q`. Code holds Effect-branded uuid strings (`StoreId`), so one entity's ID cannot be passed where another's is expected, and an ID with the wrong prefix fails decoding with a 400 before it reaches the database.

`TypeId(prefix, brand)` in `packages/domain/src/entity-ids.ts` is the one codec: it decodes the wire string to the canonical lowercase dashed uuid that Drizzle reads and writes, and encodes it back. Tables type their id columns with the brand (`uuid("id").$type<StoreId>()`). Storing the prefixed form as text is rejected: it costs index size and makes the database depend on an API spelling.

Each entity gets a lowercase prefix named for it; the example resource uses `store`. User IDs stay Better Auth's own strings.
