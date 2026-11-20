import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import nanoid from '@/lib/nanoid'

export const ledgers = sqliteTable(
    'ledgers',
    {
        id: text('id')
            .primaryKey()
            .$defaultFn(() => nanoid()),
        name: text('name').notNull(),
        description: text('description'),
        createdAt: integer('created_at', { mode: 'timestamp_ms' })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .notNull(),
        updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull()
    },
    table => [index('ledgers_id_index').on(table.id)]
)
