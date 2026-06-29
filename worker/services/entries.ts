import { HTTPException } from "hono/http-exception"

import { db } from "@/database/db"
import {
    insertEntriesSchema,
    type updateEntriesSchema,
    entriesTable
} from "@/database/schemas"

import type { z } from "zod"

import * as HTTPStatus from "@/status-codes"
import * as HTTPPhrases from "@/status-phrases"
import { eq } from "drizzle-orm"

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

export async function remove(id: string) {
    try {
        const data = await db
            .delete(entriesTable)
            .where(eq(entriesTable.id, id))

        if (!data) {
            return new HTTPException(HTTPStatus.NOT_FOUND, {
                cause: HTTPPhrases.NOT_FOUND,
                message: "entry with " + id + "does not exist"
            })
        }

        return data
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: HTTPPhrases.INTERNAL_SERVER_ERROR,
            message: "Unable to insert new entry" + error
        })
    }
}

export async function update(
    id: string,
    entry: z.infer<typeof updateEntriesSchema>
) {
    try {
        const data = await db
            .update(entriesTable)
            .set(entry)
            .where(eq(entriesTable.id, id))

        return data
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: HTTPPhrases.INTERNAL_SERVER_ERROR,
            message: "Unable to insert new entry" + error
        })
    }
}
