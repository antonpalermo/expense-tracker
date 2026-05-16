import { relations, sql } from "drizzle-orm"
import { createInsertSchema } from "drizzle-zod"
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"

import nanoid from "../../lib/nanoid"
import { formTable } from "./form"

export const entriesTable = sqliteTable(
    "entries",
    {
        id: text("id")
            .unique()
            .primaryKey()
            .$defaultFn(() => nanoid()),
        formId: text("form_id"),
        data: text("data", { mode: "json" }).$type<Record<string, unknown>[]>(),
        createdAt: integer("created_at", { mode: "timestamp_ms" })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .notNull(),
        updatedAt: integer("updated_at", { mode: "timestamp_ms" })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull()
    },
    table => [
        index("entries_id_index").on(table.id),
        index("entries_form_id_index").on(table.formId)
    ]
)

export const entriesTableRelation = relations(entriesTable, ({ one }) => ({
    form: one(formTable, {
        fields: [entriesTable.formId],
        references: [formTable.id]
    })
}))

export const entriesInsertSchema = createInsertSchema(entriesTable)
