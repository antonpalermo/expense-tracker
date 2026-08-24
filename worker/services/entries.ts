import {
    and,
    asc,
    count,
    desc,
    eq,
    inArray,
    like,
    or,
    type SQL
} from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import type { z } from 'zod'
import { db } from '@/database/db'
import {
    type createEntrySchema,
    type EntriesQuery,
    entriesTable,
    entryTypeFor,
    type updateEntrySchema,
    user
} from '@/database/schemas'
import * as HTTPStatus from '@/status-codes'

const SORT_COLUMNS = {
    date: entriesTable.createdAt,
    amount: entriesTable.amount,
    name: entriesTable.name
} as const

export async function getEntries(ledgerId: string, query: EntriesQuery) {
    try {
        // Membership was already proven by requireLedgerRole, so the join
        // below is purely for display and search — it is not an
        // authorization check. It must stay a `leftJoin`: `userId` is
        // nullable on purpose, and an inner join would silently drop
        // entries whose author was deleted.
        const conditions: (SQL | undefined)[] = [
            eq(entriesTable.ledgerId, ledgerId)
        ]

        if (query.q) {
            const pattern = `%${query.q}%`
            conditions.push(
                or(
                    like(entriesTable.name, pattern),
                    like(entriesTable.description, pattern),
                    like(user.name, pattern)
                )
            )
        }

        if (query.authorIds && query.authorIds.length > 0) {
            conditions.push(inArray(entriesTable.userId, query.authorIds))
        }

        const whereClause = and(...conditions)
        const orderFn = query.order === 'asc' ? asc : desc
        const orderBy = orderFn(SORT_COLUMNS[query.sort])

        const rowsQuery = db
            .select({
                id: entriesTable.id,
                name: entriesTable.name,
                description: entriesTable.description,
                amount: entriesTable.amount,
                type: entriesTable.type,
                userId: entriesTable.userId,
                ledgerId: entriesTable.ledgerId,
                createdAt: entriesTable.createdAt,
                updatedAt: entriesTable.updatedAt,
                authorName: user.name,
                authorImage: user.image
            })
            .from(entriesTable)
            .leftJoin(user, eq(entriesTable.userId, user.id))
            .where(whereClause)
            .orderBy(orderBy)
            .limit(query.pageSize)
            .offset((query.page - 1) * query.pageSize)

        const countQuery = db
            .select({ value: count() })
            .from(entriesTable)
            .leftJoin(user, eq(entriesTable.userId, user.id))
            .where(whereClause)

        const [data, countResult] = await Promise.all([rowsQuery, countQuery])
        const total = countResult[0]?.value ?? 0

        return {
            data,
            page: query.page,
            pageSize: query.pageSize,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize)
        }
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
