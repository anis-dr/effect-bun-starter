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
    name: text("name").notNull().unique(),
  },
  (table) => [
    // Name search (`matchesSearch`); search_text comes from a custom migration.
    index("stores_name_search_idx").using(
      "gin",
      sql`public.search_text(${table.name}) gin_trgm_ops`
    ),
  ]
);

/** Accounts the superadmin appointed as admin. The superadmin itself is
 * named by `SUPERADMIN_EMAIL` and has no row. */
export const admins = pgTable("admins", {
  appointedAt: timestamp("appointed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const schema = { admins, stores, user };
