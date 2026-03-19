import z from "zod"

import { relations } from "drizzle-orm"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core"

import { createId } from "@paralleldrive/cuid2"

import { user } from "./auth"
import { ledger } from "./ledger"

export const entry = pgTable(
  "entry",
  {
    id: text()
      .$defaultFn(() => createId())
      .unique()
      .primaryKey(),
    name: text().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ledgerId: text("ledger_id")
      .notNull()
      .references(() => ledger.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  table => [
    index("entry_userId_idx").on(table.userId),
    index("entry_ledgerId_idx").on(table.ledgerId)
  ]
)

export const entryRelations = relations(entry, ({ one }) => ({
  user: one(user, {
    fields: [entry.userId],
    references: [user.id]
  }),
  ledger: one(ledger, {
    fields: [entry.ledgerId],
    references: [ledger.id]
  })
}))

export type Entry = z.infer<typeof selectEntrySchema>

export const selectEntrySchema = createSelectSchema(entry, {
  id: z.string(),
  name: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const insertEntrySchema = createInsertSchema(entry, {
  name: z.string(),
  userId: z.string()
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
})
