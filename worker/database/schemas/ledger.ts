import z from "zod"
import { relations } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"

import { user } from "./auth"
import { entry } from "./entry"

export const ledger = pgTable(
  "ledger",
  {
    id: text()
      .$defaultFn(() => createId())
      .unique()
      .primaryKey(),
    name: text().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  table => [index("ledger_userId_idx").on(table.userId)]
)

export const ledgerRelations = relations(ledger, ({ one, many }) => ({
  user: one(user, {
    fields: [ledger.userId],
    references: [user.id]
  }),
  entries: many(entry)
}))

export const selectLedgerSchema = createSelectSchema(ledger)
export const insertLedgerSchema = createInsertSchema(ledger, {
  name: z.string(),
  userId: z.string()
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

export type LedgerInput = z.infer<typeof insertLedgerSchema>
