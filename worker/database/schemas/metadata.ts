import { createId } from "@paralleldrive/cuid2"

import { relations } from "drizzle-orm"
import { jsonb, text, index, timestamp, pgTable } from "drizzle-orm/pg-core"

import { user } from "./auth"

export type Defaults = {
  ledgerId: string
}

export const metadata = pgTable(
  "metadata",
  {
    id: text()
      .$defaultFn(() => createId())
      .unique()
      .primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    defauts: jsonb().$type<Defaults>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  table => [index("metadata_userId_idx").on(table.userId)]
)

export const metadataRelations = relations(metadata, ({ one }) => ({
  user: one(user, {
    fields: [metadata.userId],
    references: [user.id]
  })
}))
