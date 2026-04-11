import z from "zod"
import { relations, sql } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema
} from "drizzle-zod"

import { user } from "./auth"
import { entry } from "./entry"

export const ledger = sqliteTable(
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
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
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
export const updateLedgerSchema = createUpdateSchema(ledger)
export const insertLedgerSchema = createInsertSchema(ledger, {
  name: z.string(),
  userId: z.string()
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

export type LedgerInput = z.infer<typeof insertLedgerSchema>
