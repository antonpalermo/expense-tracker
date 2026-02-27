import { relations } from "drizzle-orm"
import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core"

import { nanoid } from "@/lib/nanoid"

import { user } from "@/database/schemas/user"
import { ledger } from "@/database/schemas/ledger"

export const transaction = pgTable("transaction", {
  id: text("id")
    .$defaultFn(() => nanoid())
    .unique()
    .notNull()
    .primaryKey(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
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
