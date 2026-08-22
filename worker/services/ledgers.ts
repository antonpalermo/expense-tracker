import { and, desc, eq, ne } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import type { z } from 'zod'
import { db } from '@/database/db'
import {
    type createLedgerSchema,
    formTable,
    ledgerMembersTable,
    ledgersTable,
    type updateLedgerSchema
} from '@/database/schemas'
import nanoid from '@/lib/nanoid'
import * as HTTPStatus from '@/status-codes'
import { createBlankFields } from './forms'

export async function getLedgersForUser(userId: string) {
    try {
        return await db
            .select({
                id: ledgersTable.id,
                name: ledgersTable.name,
                description: ledgersTable.description,
                createdAt: ledgersTable.createdAt,
                updatedAt: ledgersTable.updatedAt,
                role: ledgerMembersTable.role
            })
            .from(ledgerMembersTable)
            .innerJoin(
                ledgersTable,
                eq(ledgerMembersTable.ledgerId, ledgersTable.id)
            )
            .where(eq(ledgerMembersTable.userId, userId))
            .orderBy(desc(ledgersTable.updatedAt))
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to fetch ledgers'
        })
    }
}

export async function getLedger(ledgerId: string) {
    let ledger: typeof ledgersTable.$inferSelect | undefined

    try {
        ;[ledger] = await db
            .select()
            .from(ledgersTable)
            .where(eq(ledgersTable.id, ledgerId))
            .limit(1)
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to fetch ledger'
        })
    }

    if (!ledger) {
        throw new HTTPException(HTTPStatus.NOT_FOUND, {
            message: 'ledger not found'
        })
    }

    return ledger
}

export async function create(
    values: z.infer<typeof createLedgerSchema>,
    userId: string
) {
    // D1 has no interactive transactions (drizzle issues a literal `begin`,
    // which D1 rejects), so the ledger, its owner membership and its form row
    // go out as one batch. The id is pre-generated so all three agree.
    const ledgerId = nanoid()

    try {
        await db.batch([
            db.insert(ledgersTable).values({
                id: ledgerId,
                name: values.name,
                description: values.description ?? null,
                createdBy: userId
            }),
            db
                .insert(ledgerMembersTable)
                .values({ ledgerId, userId, role: 'owner' }),
            db
                .insert(formTable)
                .values({ ledgerId, fields: createBlankFields() })
        ])
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to create ledger'
        })
    }

    return { ...(await getLedger(ledgerId)), role: 'owner' as const }
}

export async function update(
    ledgerId: string,
    values: z.infer<typeof updateLedgerSchema>
) {
    let ledger: typeof ledgersTable.$inferSelect | undefined

    try {
        ;[ledger] = await db
            .update(ledgersTable)
            .set(values)
            .where(eq(ledgersTable.id, ledgerId))
            .returning()
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to update ledger'
        })
    }

    if (!ledger) {
        throw new HTTPException(HTTPStatus.NOT_FOUND, {
            message: 'ledger not found'
        })
    }

    return ledger
}

export async function remove(ledgerId: string) {
    let ledger: typeof ledgersTable.$inferSelect | undefined

    try {
        ;[ledger] = await db
            .delete(ledgersTable)
            .where(eq(ledgersTable.id, ledgerId))
            .returning()
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to delete ledger'
        })
    }

    if (!ledger) {
        throw new HTTPException(HTTPStatus.NOT_FOUND, {
            message: 'ledger not found'
        })
    }

    return ledger
}

export async function transferOwnership(
    ledgerId: string,
    currentOwnerId: string,
    nextOwnerId: string
) {
    if (currentOwnerId === nextOwnerId) {
        throw new HTTPException(HTTPStatus.CONFLICT, {
            message: 'you already own this ledger'
        })
    }

    const [target] = await db
        .select({ id: ledgerMembersTable.id })
        .from(ledgerMembersTable)
        .where(
            and(
                eq(ledgerMembersTable.ledgerId, ledgerId),
                eq(ledgerMembersTable.userId, nextOwnerId)
            )
        )
        .limit(1)

    if (!target) {
        throw new HTTPException(HTTPStatus.NOT_FOUND, {
            message: 'that user is not a member of this ledger'
        })
    }

    try {
        // Demote first: ledger_members_owner_unique would reject two owners, so
        // a half-applied batch surfaces as a constraint error, not silent drift.
        await db.batch([
            db
                .update(ledgerMembersTable)
                .set({ role: 'admin' })
                .where(
                    and(
                        eq(ledgerMembersTable.ledgerId, ledgerId),
                        eq(ledgerMembersTable.userId, currentOwnerId)
                    )
                ),
            db
                .update(ledgerMembersTable)
                .set({ role: 'owner' })
                .where(
                    and(
                        eq(ledgerMembersTable.ledgerId, ledgerId),
                        eq(ledgerMembersTable.userId, nextOwnerId)
                    )
                )
        ])
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to transfer ownership'
        })
    }

    return { msg: 'ownership transferred' }
}

export async function leave(ledgerId: string, userId: string) {
    let removed: typeof ledgerMembersTable.$inferSelect | undefined

    try {
        // Guarded by `ne(role, 'owner')`: an ownerless ledger can never be
        // deleted, since DELETE /ledgers/:id requires the owner role.
        ;[removed] = await db
            .delete(ledgerMembersTable)
            .where(
                and(
                    eq(ledgerMembersTable.ledgerId, ledgerId),
                    eq(ledgerMembersTable.userId, userId),
                    ne(ledgerMembersTable.role, 'owner')
                )
            )
            .returning()
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to leave ledger'
        })
    }

    if (!removed) {
        throw new HTTPException(HTTPStatus.CONFLICT, {
            message:
                'the owner cannot leave — transfer ownership or delete the ledger first'
        })
    }

    return { msg: 'left ledger' }
}
