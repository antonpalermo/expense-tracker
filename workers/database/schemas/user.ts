import { relations } from "drizzle-orm"
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core"

import { ledger } from "@/database/schemas/ledger"
import { session } from "@/database/schemas/session"
import { account } from "@/database/schemas/account"
import { metadata } from "@/database/schemas/metadata"
import { transaction } from "@/database/schemas/transaction"

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

export const userRelations = relations(user, ({ many, one }) => ({
  metadata: one(metadata),
  sessions: many(session),
  accounts: many(account),
  ledgers: many(ledger),
  transactions: many(transaction)
}))
