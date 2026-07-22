import { sql } from 'drizzle-orm'
import {
    index,
    integer,
    real,
    sqliteTable,
    text
} from 'drizzle-orm/sqlite-core'
import {
    createInsertSchema,
    createSelectSchema,
    createUpdateSchema
} from 'drizzle-zod'
import { z } from 'zod'
import nanoid from '../../lib/nanoid'

export const entriesTable = sqliteTable(
    'entries',
    {
        id: text('id')
            .unique()
            .primaryKey()
            .$defaultFn(() => nanoid()),
        name: text('name').notNull(),
        description: text('description'),
        amount: real('amount').notNull(),
        createdAt: integer('created_at', { mode: 'timestamp_ms' })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .notNull(),
        updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull()
    },
    table => [index('entries_id_index').on(table.id)]
)

export const insertEntriesSchema = createInsertSchema(entriesTable)
export const updateEntriesSchema = createUpdateSchema(entriesTable, {
    name: z.string(),
    description: z.string(),
    amount: z.coerce.number()
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true
})
export const selectEntriesSchema = createSelectSchema(entriesTable, {
    id: z.string(),
    name: z.string(),
    description: z.string(),
    amount: z.coerce.number()
})
