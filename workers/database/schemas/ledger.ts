import z from "zod"
import { relations } from "drizzle-orm"
import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core"

import { nanoid } from "@/lib/nanoid"
import { user } from "@/database/schemas/user"
import { transaction } from "@/database/schemas/transaction"
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema
} from "drizzle-zod"

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

export const ledgerRelations = relations(ledger, ({ one, many }) => ({
  user: one(user, {
    fields: [ledger.userId],
    references: [user.id]
  }),
  transactions: many(transaction)
}))

export const selectLedgerSchema = createSelectSchema(ledger)
export const insertLedgerSchema = createInsertSchema(ledger)
export const updateLedgerSchema = createUpdateSchema(ledger)

export type Ledger = z.infer<typeof selectLedgerSchema>
export type LedgerFields = z.infer<typeof insertLedgerSchema>
export type LedgerOptional = z.infer<typeof updateLedgerSchema>
