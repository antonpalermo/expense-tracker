import { sql } from "drizzle-orm"
import { createInsertSchema } from "drizzle-zod"
import {
    sqliteTable,
    text,
    integer,
    index,
    real
} from "drizzle-orm/sqlite-core"

import nanoid from "../../lib/nanoid"

export const entriesTable = sqliteTable(
    "entries",
    {
        id: text("id")
            .unique()
            .primaryKey()
            .$defaultFn(() => nanoid()),
        name: text("name").notNull(),
        description: text("description"),
        amount: real("amount").notNull(),
        createdAt: integer("created_at", { mode: "timestamp_ms" })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .notNull(),
        updatedAt: integer("updated_at", { mode: "timestamp_ms" })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull()
    },
    table => [index("entries_id_index").on(table.id)]
)

export const entriesInsertSchema = createInsertSchema(entriesTable)
