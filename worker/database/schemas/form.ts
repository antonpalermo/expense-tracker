import { sql } from "drizzle-orm"
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"

import nanoid from "../../lib/nanoid"
import type { Field } from "../../bindings"

export const formTable = sqliteTable("forms", {
    id: text()
        .unique()
        .primaryKey()
        .$defaultFn(() => nanoid()),
    schema: text({ mode: "json" }).$type<Field>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
        .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
        .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
        .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull()
})
