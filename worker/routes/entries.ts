import { Hono } from "hono"
import { db } from "../database/db"
import { entriesInsertSchema, entriesTable } from "../database/schemas/entries"

import type { Bindings } from "../bindings"

import z from "zod"

type Entries = z.infer<typeof entriesInsertSchema>

const routes = new Hono<Bindings>({ strict: false }).basePath("/entries")

async function createTask(entries: Entries) {
    const sanitizedPayload = entriesInsertSchema.safeParse(entries)

    if (!sanitizedPayload.success) {
        return
    }

    const entry = await db
        .insert(entriesTable)
        .values(sanitizedPayload.data)
        .returning()

    return entry
}

routes.on(["POST"], "/", async ctx => {
    const method = ctx.req.method

    switch (method) {
        case "POST": {
            const body = await ctx.req.json()

            const task = await createTask(body)
            return ctx.json(task)
        }
    }
})

export default routes
