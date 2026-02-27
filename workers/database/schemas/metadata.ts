import { relations } from "drizzle-orm"
import {
  pgTable,
  text,
  json,
  timestamp,
  index,
  uniqueIndex
} from "drizzle-orm/pg-core"

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
