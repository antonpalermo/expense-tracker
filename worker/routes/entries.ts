import { Hono } from "hono"
import { db } from "../database/db"
import { entriesInsertSchema, entriesTable } from "../database/schemas/entries"

import type { Bindings } from "../bindings"

import z from "zod"
import { eq } from "drizzle-orm"
import { formTable } from "@/database/schemas"

type Entries = z.infer<typeof entriesInsertSchema>

const routes = new Hono<Bindings>({ strict: false }).basePath("/entries")

async function createEntry(details: Entries) {
    const sanitizedPayload = entriesInsertSchema.safeParse(details)

    if (!sanitizedPayload.success) {
        return
    }

    const entry = await db
        .insert(entriesTable)
        .values(sanitizedPayload.data)
        .returning()

    return entry
}

async function getEntries(formId: string) {
    const formResult = await db.query.formTable.findFirst({
        where: eq(formTable.id, formId),
        columns: {
            fields: true
        },
        with: {
            entries: {
                columns: {
                    data: true
                }
            }
        }
    })

    const fields = formResult?.fields?.map(field => {
        const schema = [[field.uid, field.name]]
        return Object.fromEntries(schema)
    })

    const records = formResult?.entries.map(entry => ({ ...entry.data }))

    const sanitizedResult = fields && Object.assign({}, ...fields)

    const entries = records?.map(record => {
        const transformedRecord: Record<string, unknown> = {}

        Object.entries(record).forEach(([key, value]) => {
            const readableKey = sanitizedResult[key]
            if (readableKey) {
                transformedRecord[readableKey] = value
            }
        })

        return transformedRecord
    })

    return entries
}

routes.on(["POST"], "/", async ctx => {
    const method = ctx.req.method

    switch (method) {
        case "POST": {
            const body = await ctx.req.json()

            const task = await createEntry(body)
            return ctx.json(task)
        }
    }
})

routes.get("/:id", async ctx => {
    const { id } = ctx.req.param()

    const entries = await getEntries(id)

    return ctx.json(entries)
})

export default routes
