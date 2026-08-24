import { sql } from 'drizzle-orm'
import {
    index,
    integer,
    real,
    sqliteTable,
    text
} from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import nanoid from '../../lib/nanoid'
import { user } from './auth'
import { ledgersTable } from './ledgers'

export const ENTRY_TYPES = ['debit', 'credit'] as const
export type EntryType = (typeof ENTRY_TYPES)[number]

/**
 * The sign of `amount` is the source of truth; the `type` column is only its
 * materialized, queryable form. Deriving it server-side on every write is what
 * makes the two impossible to contradict.
 */
export const entryTypeFor = (amount: number): EntryType =>
    amount < 0 ? 'debit' : 'credit'

export const ENTRIES_SORT_FIELDS = ['date', 'amount', 'name'] as const
export type EntriesSort = (typeof ENTRIES_SORT_FIELDS)[number]

export const ENTRIES_ORDER = ['asc', 'desc'] as const
export type EntriesOrder = (typeof ENTRIES_ORDER)[number]

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
        // Derived from the sign of `amount` by `entryTypeFor`, never accepted
        // from the client. The default exists only so the column could be
        // added to the existing table; no insert path relies on it.
        type: text('type', { enum: ENTRY_TYPES }).notNull().default('credit'),
        // The author. Nullable on purpose: in a shared ledger, deleting a
        // user must not delete the ledger's entries.
        userId: text('user_id').references(() => user.id, {
            onDelete: 'set null'
        }),
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
        index('entries_id_index').on(table.id),
        index('entries_ledger_id_index').on(table.ledgerId),
        index('entries_ledger_id_created_at_index').on(
            table.ledgerId,
            table.createdAt
        )
    ]
)

export const insertEntriesSchema = createInsertSchema(entriesTable)

// Hand-written request bodies. `userId` and `ledgerId` are stamped from the
// Hono context, never accepted from the client — otherwise a PATCH could move
// an entry into a ledger the caller does not belong to.
export const createEntrySchema = z.object({
    name: z.string().trim().min(1),
    description: z.string().trim().nullish(),
    amount: z.coerce.number()
})
export const updateEntrySchema = createEntrySchema.partial()
export const selectEntriesSchema = createSelectSchema(entriesTable, {
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    amount: z.coerce.number(),
    type: z.enum(ENTRY_TYPES),
    userId: z.string().nullable(),
    ledgerId: z.string()
})

// TanStack Router's default search-param serialization JSON-encodes any
// non-primitive value, so an array search param arrives here as a JSON
// string (e.g. `authorIds=%5B%22a%22%2C%22b%22%5D`), not as a repeated
// query key. This preprocessor undoes that before zod sees it.
const authorIdsParam = z.preprocess(value => {
    if (typeof value !== 'string' || value.length === 0) {
        return undefined
    }

    try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : undefined
    } catch {
        return undefined
    }
}, z.array(z.string()).optional())

export const entriesQuerySchema = z.object({
    q: z.string().trim().min(1).optional(),
    sort: z.enum(ENTRIES_SORT_FIELDS).optional().default('date'),
    order: z.enum(ENTRIES_ORDER).optional().default('desc'),
    authorIds: authorIdsParam,
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce.number().int().positive().max(100).optional().default(20)
})
export type EntriesQuery = z.infer<typeof entriesQuerySchema>
