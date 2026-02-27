import z from "zod"
import { relations } from "drizzle-orm"
import {
  pgTable,
  text,
  json,
  timestamp,
  index,
  uniqueIndex
} from "drizzle-orm/pg-core"
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema
} from "drizzle-zod"

import { nanoid } from "@/lib/nanoid"
import { user } from "@/database/schemas/user"

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

export const metadataRelations = relations(metadata, ({ one }) => ({
  user: one(user, {
    fields: [metadata.userId],
    references: [user.id]
  })
}))

export const selectMetadataSchema = createSelectSchema(metadata)
export const insertMetadataSchema = createInsertSchema(metadata)
export const updateMetadataSchema = createUpdateSchema(metadata)

export type Metadata = z.infer<typeof selectMetadataSchema>
export type MetadataFields = z.infer<typeof insertMetadataSchema>
export type MetadataOptional = z.infer<typeof updateMetadataSchema>
