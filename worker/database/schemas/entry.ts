import z from "zod"

import { relations, sql } from "drizzle-orm"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"

import { createId } from "@paralleldrive/cuid2"
import { user } from "./auth"

export const entry = sqliteTable(
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
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  table => [index("entry_userId_idx").on(table.userId)]
)

export const entryRelations = relations(entry, ({ one }) => ({
  user: one(user, {
    fields: [entry.userId],
    references: [user.id]
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
