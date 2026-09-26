import type { StoreId } from "@effect-bun-starter/domain";
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Better Auth's user table lives here so domain tables can reference it;
// packages/auth re-exports it from its generated schema.
export const user = pgTable("user", {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  id: text("id").primaryKey(),
  image: text("image"),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => sql`now()`)
    .notNull(),
});

export const stores = pgTable(
  "stores",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: uuid("id")
      .$type<StoreId>()
      .primaryKey()
      .default(sql`uuidv7()`),
    name: text("name").notNull(),
  },
  (table) => [
    // Name search (`matchesSearch`); search_text comes from a custom migration.
    index("stores_name_search_idx").using(
      "gin",
      sql`public.search_text(${table.name}) gin_trgm_ops`
    ),
  ]
);

export const schema = { stores, user };
