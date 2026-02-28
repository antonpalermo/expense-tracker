import { sqliteTable, text } from "drizzle-orm/sqlite-core"
import { createId } from "@paralleldrive/cuid2"

export const transaction = sqliteTable("transaction", {
  id: text()
    .$defaultFn(() => createId())
    .unique()
    .primaryKey(),
  name: text().notNull()
})
