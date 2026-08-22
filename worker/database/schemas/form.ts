import { sql } from 'drizzle-orm'
import {
    index,
    integer,
    sqliteTable,
    text,
    uniqueIndex
} from 'drizzle-orm/sqlite-core'
import { z } from 'zod'
import type { Field } from '../../bindings'
import nanoid from '../../lib/nanoid'
import { ledgersTable } from './ledgers'

export const formTable = sqliteTable(
    'forms',
    {
        id: text()
            .unique()
            .primaryKey()
            .$defaultFn(() => nanoid()),
        fields: text({ mode: 'json' }).$type<Field[]>(),
        ledgerId: text('ledger_id')
            .notNull()
            .references(() => ledgersTable.id, { onDelete: 'cascade' }),
        createdAt: integer('created_at', { mode: 'timestamp_ms' })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .notNull(),
        updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull()
    },
    table => [
        index('form_id_index').on(table.id),
        // One form configuration per ledger.
        uniqueIndex('forms_ledger_id_unique').on(table.ledgerId)
    ]
)

// Mirrors `Field` in worker/bindings.ts minus the server-generated `uid`.
export const createFieldSchema = z.discriminatedUnion('type', [
    z.object({
        name: z.string().trim().min(1).max(60),
        type: z.literal('text'),
        default: z.string()
    }),
    z.object({
        name: z.string().trim().min(1).max(60),
        type: z.literal('number'),
        default: z.number()
    })
])
