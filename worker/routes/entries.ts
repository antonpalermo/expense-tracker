import { Hono } from "hono"
import { db } from "../database/db"
import { entriesInsertSchema, entriesTable } from "../database/schemas/entries"

import type { Field } from "../bindings"
import type { HonoBindings } from "../index"

import z from "zod"
import { eq } from "drizzle-orm"
import { HTTPException } from "hono/http-exception"

type Entries = z.infer<typeof entriesInsertSchema>

const routes = new Hono<HonoBindings>({ strict: false }).basePath("/entries")

function parseFields(
    fields: Field[] | null | undefined
): Record<string, string>[] {
    if (!fields) {
        throw new Error("fields cannot be null")
    }

    return fields
        .map(field => [[field.uid, field.name]])
        .map(result => Object.fromEntries(result))
}

function mapFields(
    fields: Record<string, string>[],
    data: Record<string, unknown>
) {
    return fields.reduce<Record<string, unknown>>((prev, curr) => {
        Object.entries(curr).forEach(([key, value]) => {
            if (typeof value === "string") {
                prev[value] = data[key] ?? null
            }
        })

        return prev
    }, {})
}

function parse(fields: Field[] | null): Record<string, unknown> {
    if (!fields) {
        throw new Error("")
    }

    return Object.fromEntries(
        fields.map(form => [form.uid, form.name.toLowerCase()])
    )
}

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

async function getEntries() {
    const response = await db.query.formTable.findFirst({
        columns: {
            fields: true
        },
        with: {
            entries: {
                columns: {
                    id: true,
                    data: true,
                    createdAt: true,
                    updatedAt: true
                }
            }
        }
    })

    if (!response) {
        throw new Error("no form found")
    }

    console.log(parse(response.fields), parseFields(response.fields))

    return response.entries.map(({ id, data, createdAt, updatedAt }) => ({
        id,
        ...Object.fromEntries(
            Object.entries(parse(response.fields)).map(([key, value]) => [
                value,
                data ? (data[key] ?? null) : null
            ])
        ),
        createdAt,
        updatedAt
    }))
}

async function getEntry(id: string) {
    const result = await db.query.entriesTable.findFirst({
        where: eq(entriesTable.id, id),
        columns: {
            data: true
        },
        with: {
            form: {
                columns: { fields: true }
            }
        }
    })

    if (!result) {
        throw new HTTPException(404)
    }

    if (!result.form?.fields || !result.data) {
        throw new Error("no fields available")
    }

    const fields = parseFields(result.form.fields)
    const data = mapFields(fields, result.data)

    return data
}

routes.on(["POST", "GET"], "/", async ctx => {
    const method = ctx.req.method

    switch (method) {
        case "GET": {
            const entries = await getEntries()

            return ctx.json(entries)
        }
        case "POST": {
            const body = await ctx.req.json()

            const task = await createEntry(body)
            return ctx.json(task)
        }
    }
})

routes.on(["GET", "PATCH", "DELETE"], "/:id", async ctx => {
    const method = ctx.req.method
    const id = ctx.req.param("id")

    switch (method) {
        case "GET": {
            const entry = await getEntry(id)
            return ctx.json(entry)
        }
        case "PATCH": {
            return ctx.json({ msg: "Hello from patch" + id })
        }
        case "DELETE": {
            return ctx.json({ msg: "Hello from delete" + id })
        }
    }
})

export default routes
