import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import type { Field } from '../../bindings'
import nanoid from '../../lib/nanoid'
import { entriesTable } from './entries'

export const formTable = sqliteTable(
    'forms',
    {
        id: text()
            .unique()
            .primaryKey()
            .$defaultFn(() => nanoid()),
        fields: text({ mode: 'json' }).$type<Field[]>(),
        createdAt: integer('created_at', { mode: 'timestamp_ms' })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .notNull(),
        updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull()
    },
    table => [index('form_id_index').on(table.id)]
)

export const formTableRelations = relations(formTable, ({ many }) => ({
    entries: many(entriesTable)
}))
