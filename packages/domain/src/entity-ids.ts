import { Schema, SchemaGetter } from "effect";

// TypeID spec: https://github.com/jetify-com/typeid/tree/main/spec
const alphabet = "0123456789abcdefghjkmnpqrstvwxyz";

// Canonical lowercase dashed form, what Drizzle `uuid()` reads and writes.
// Any 128-bit value, not only RFC versions: TypeID and PostgreSQL `uuid` accept them all.
const Uuid = Schema.String.check(
  Schema.isPattern(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  )
);

// ponytail: BigInt base32, one pass over 26 chars; bit-shuffling tables if IDs ever show up in a profile.
const encodeSuffix = (uuid: string) => {
  let value = BigInt(`0x${uuid.replaceAll("-", "")}`);
  let suffix = "";
  for (let index = 0; index < 26; index += 1) {
    suffix = alphabet[Number(value & 31n)] + suffix;
    value >>= 5n;
  }
  return suffix;
};

const decodeSuffix = (suffix: string) => {
  let value = 0n;
  for (const char of suffix) {
    value = (value << 5n) | BigInt(alphabet.indexOf(char));
  }
  const hex = value.toString(16).padStart(32, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/**
 * Entity ID: a branded uuid in code, `<prefix>_<26 Crockford base32>` on the
 * wire (ADR 0013). The first suffix char is at most `7`, otherwise the value
 * overflows 128 bits.
 */
const TypeId = <B extends string>(prefix: string, brand: B) =>
  Schema.String.check(
    Schema.isPattern(new RegExp(`^${prefix}_[0-7][0-9a-hjkmnp-tv-z]{25}$`), {
      expected: `a ${prefix}_ TypeID`,
    })
  ).pipe(
    Schema.decodeTo(Schema.brand(brand)(Uuid), {
      decode: SchemaGetter.transform((id) =>
        decodeSuffix(id.slice(prefix.length + 1))
      ),
      encode: SchemaGetter.transform(
        (uuid) => `${prefix}_${encodeSuffix(uuid)}`
      ),
    })
  );

export const StoreId = TypeId("store", "StoreId");
export type StoreId = typeof StoreId.Type;
