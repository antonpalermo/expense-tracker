import { createId } from "@paralleldrive/cuid2"

import { relations, sql } from "drizzle-orm"
import {
  blob,
  text,
  index,
  integer,
  sqliteTable
} from "drizzle-orm/sqlite-core"

import { user } from "./auth"

export type Defaults = {
  ledgerId: string
}

export const metadata = sqliteTable(
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
    defauts: blob({ mode: "json" }).$type<Defaults>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
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
