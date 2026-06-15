import { HTTPException } from "hono/http-exception"

import { db } from "@/database/db"
import { insertEntriesSchema, entriesTable } from "@/database/schemas"

import type { z } from "zod"

import * as HTTPStatus from "@/status-codes"
import * as HTTPPhrases from "@/status-phrases"

export async function create(entry: z.infer<typeof insertEntriesSchema>) {
    try {
        const [data] = await db.insert(entriesTable).values(entry).returning()
        return data
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: HTTPPhrases.INTERNAL_SERVER_ERROR,
            message: "Unable to insert new entry" + error
        })
    }
}

export async function getEntries() {
    try {
        const data = await db.select().from(entriesTable)
        return data
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: HTTPPhrases.INTERNAL_SERVER_ERROR,
            message: "Unable to insert new entry" + error
        })
    }
}
