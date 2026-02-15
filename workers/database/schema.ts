import { relations } from "drizzle-orm"
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  decimal,
  json,
  uniqueIndex
} from "drizzle-orm/pg-core"
import { nanoid } from "../lib/nanoid"
import { createInsertSchema } from "drizzle-zod"

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull()
})

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
  },
  table => [index("session_userId_idx").on(table.userId)]
)

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  table => [index("account_userId_idx").on(table.userId)]
)

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  table => [index("verification_identifier_idx").on(table.identifier)]
)

export const metadata = pgTable(
  "metadata",
  {
    id: text("id")
      .$defaultFn(() => nanoid())
      .unique()
      .notNull()
      .primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    defaults: json("defaults").$type<{ ledger: string }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  table => [
    index("metadata_id_idx").on(table.id),
    uniqueIndex("metadata_userId_unique_idx").on(table.userId)
  ]
)

export const ledger = pgTable(
  "ledger",
  {
    id: text("id")
      .$defaultFn(() => nanoid())
      .unique()
      .notNull()
      .primaryKey(),
    name: text("name").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  table => [
    index("ledger_id_idx").on(table.id),
    index("ledger_userId_idx").on(table.userId)
  ]
)

export const transaction = pgTable("transaction", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  amount: decimal({ precision: 100 }).notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ledgerId: text("ledger_id")
    .notNull()
    .references(() => ledger.id, { onDelete: "no action" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull()
})

export const userRelations = relations(user, ({ many, one }) => ({
  metadata: one(metadata),
  sessions: many(session),
  accounts: many(account),
  ledgers: many(ledger),
  transactions: many(transaction)
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id]
  })
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id]
  })
}))

export const metadataRelations = relations(metadata, ({ one }) => ({
  user: one(user, {
    fields: [metadata.userId],
    references: [user.id]
  })
}))

export const ledgerRelations = relations(ledger, ({ one, many }) => ({
  user: one(user, {
    fields: [ledger.userId],
    references: [user.id]
  }),
  transactions: many(transaction)
}))

export const transactionRelations = relations(transaction, ({ one }) => ({
  user: one(user, {
    fields: [transaction.userId],
    references: [user.id]
  }),
  ledger: one(ledger, {
    fields: [transaction.ledgerId],
    references: [ledger.id]
  })
}))

export type Ledger = typeof ledger.$inferSelect
export const createLedgerSchema = createInsertSchema(ledger, {
  name: field => field.min(3).max(500)
})
  .required()
  .omit({
    id: true,
    userId: true,
    createdAt: true,
    updatedAt: true
  })
