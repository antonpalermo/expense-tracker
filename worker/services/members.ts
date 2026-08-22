import { and, eq, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '@/database/db'
import {
    type AssignableRole,
    account,
    type LedgerRole,
    ledgerMembersTable,
    user
} from '@/database/schemas'
import { outranks } from '@/lib/ledger-access'
import * as HTTPStatus from '@/status-codes'

export async function getMembers(ledgerId: string) {
    try {
        // `hasSignedIn` is derived, not stored: a member invited by email has a
        // `user` row but no `account` row until they complete a Google sign-in.
        // `emailVerified` cannot stand in for this — better-auth never flips it
        // when linking a provider to an existing user.
        return await db
            .select({
                id: ledgerMembersTable.id,
                userId: ledgerMembersTable.userId,
                role: ledgerMembersTable.role,
                createdAt: ledgerMembersTable.createdAt,
                name: user.name,
                email: user.email,
                image: user.image,
                hasSignedIn: sql<number>`(${account.id} is not null)`
            })
            .from(ledgerMembersTable)
            .innerJoin(user, eq(ledgerMembersTable.userId, user.id))
            .leftJoin(account, eq(account.userId, user.id))
            .where(eq(ledgerMembersTable.ledgerId, ledgerId))
            .groupBy(ledgerMembersTable.id)
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to fetch members'
        })
    }
}

async function getMember(ledgerId: string, memberId: string) {
    const [member] = await db
        .select()
        .from(ledgerMembersTable)
        .where(
            and(
                eq(ledgerMembersTable.id, memberId),
                eq(ledgerMembersTable.ledgerId, ledgerId)
            )
        )
        .limit(1)

    if (!member) {
        throw new HTTPException(HTTPStatus.NOT_FOUND, {
            message: 'member not found'
        })
    }

    return member
}

/**
 * One rule covers every case: you may only act on a member you strictly
 * outrank. So an admin manages members and viewers but not another admin or the
 * owner, and the owner can never be demoted or removed.
 */
function assertCanManage(
    actorRole: LedgerRole,
    target: typeof ledgerMembersTable.$inferSelect
) {
    if (!outranks(actorRole, target.role)) {
        throw new HTTPException(HTTPStatus.FORBIDDEN, {
            message: `you cannot manage a member with the ${target.role} role`
        })
    }
}

export async function updateRole(
    ledgerId: string,
    memberId: string,
    role: AssignableRole,
    actor: { userId: string; role: LedgerRole }
) {
    const member = await getMember(ledgerId, memberId)

    assertCanManage(actor.role, member)

    // You also cannot promote someone to your own rank or above.
    if (!outranks(actor.role, role)) {
        throw new HTTPException(HTTPStatus.FORBIDDEN, {
            message: `you cannot assign the ${role} role`
        })
    }

    if (member.userId === actor.userId) {
        throw new HTTPException(HTTPStatus.CONFLICT, {
            message: 'you cannot change your own role'
        })
    }

    try {
        const [updated] = await db
            .update(ledgerMembersTable)
            .set({ role })
            .where(eq(ledgerMembersTable.id, memberId))
            .returning()

        return updated
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to update the member role'
        })
    }
}

export async function removeMember(
    ledgerId: string,
    memberId: string,
    actor: { userId: string; role: LedgerRole }
) {
    const member = await getMember(ledgerId, memberId)

    if (member.userId === actor.userId) {
        throw new HTTPException(HTTPStatus.CONFLICT, {
            message: 'use leave to remove yourself from a ledger'
        })
    }

    assertCanManage(actor.role, member)

    try {
        await db
            .delete(ledgerMembersTable)
            .where(eq(ledgerMembersTable.id, memberId))
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to remove the member'
        })
    }

    return { msg: 'member removed' }
}

export async function getMemberUser(ledgerId: string, memberId: string) {
    const [row] = await db
        .select({
            userId: user.id,
            name: user.name,
            email: user.email,
            hasSignedIn: sql<number>`(${account.id} is not null)`
        })
        .from(ledgerMembersTable)
        .innerJoin(user, eq(ledgerMembersTable.userId, user.id))
        .leftJoin(account, eq(account.userId, user.id))
        .where(
            and(
                eq(ledgerMembersTable.id, memberId),
                eq(ledgerMembersTable.ledgerId, ledgerId)
            )
        )
        .limit(1)

    if (!row) {
        throw new HTTPException(HTTPStatus.NOT_FOUND, {
            message: 'member not found'
        })
    }

    return row
}
