import { and, desc, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import type { z } from 'zod'
import { db } from '@/database/db'
import {
    type createEntrySchema,
    entriesTable,
    entryTypeFor,
    type updateEntrySchema
} from '@/database/schemas'
import * as HTTPStatus from '@/status-codes'

export async function getEntries(ledgerId: string) {
    try {
        // Membership was already proven by requireLedgerRole, so no join here.
        return await db
            .select()
            .from(entriesTable)
            .where(eq(entriesTable.ledgerId, ledgerId))
            .orderBy(desc(entriesTable.createdAt))
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to fetch entries'
        })
    }
}

export async function create(
    ledgerId: string,
    userId: string,
    entry: z.infer<typeof createEntrySchema>
) {
    try {
        const [data] = await db
            .insert(entriesTable)
            .values({
                ...entry,
                description: entry.description ?? null,
                ledgerId,
                userId,
                type: entryTypeFor(entry.amount)
            })
            .returning()

        return data
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to insert new entry'
        })
    }
}

export async function getEntry(ledgerId: string, entryId: string) {
    let data: typeof entriesTable.$inferSelect | undefined

    try {
        ;[data] = await db
            .select()
            .from(entriesTable)
            .where(
                and(
                    eq(entriesTable.id, entryId),
                    eq(entriesTable.ledgerId, ledgerId)
                )
            )
            .limit(1)
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to fetch entry'
        })
    }

    if (!data) {
        throw new HTTPException(HTTPStatus.NOT_FOUND, {
            message: 'entry not found'
        })
    }

    return data
}

export async function update(
    ledgerId: string,
    entryId: string,
    entry: z.infer<typeof updateEntrySchema>
) {
    let data: typeof entriesTable.$inferSelect | undefined

    // The patch is partial, so the type is only recomputed when the amount it
    // derives from is actually being changed.
    const patch =
        entry.amount === undefined
            ? entry
            : { ...entry, type: entryTypeFor(entry.amount) }

    try {
        // Scoping by ledgerId means an entry id from another ledger simply
        // matches no rows and 404s — no second lookup needed.
        ;[data] = await db
            .update(entriesTable)
            .set(patch)
            .where(
                and(
                    eq(entriesTable.id, entryId),
                    eq(entriesTable.ledgerId, ledgerId)
                )
            )
            .returning()
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to update entry'
        })
    }

    if (!data) {
        throw new HTTPException(HTTPStatus.NOT_FOUND, {
            message: 'entry not found'
        })
    }

    return data
}

export async function remove(ledgerId: string, entryId: string) {
    let data: typeof entriesTable.$inferSelect | undefined

    try {
        ;[data] = await db
            .delete(entriesTable)
            .where(
                and(
                    eq(entriesTable.id, entryId),
                    eq(entriesTable.ledgerId, ledgerId)
                )
            )
            .returning()
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to delete entry'
        })
    }

    if (!data) {
        throw new HTTPException(HTTPStatus.NOT_FOUND, {
            message: 'entry not found'
        })
    }

    return data
}
