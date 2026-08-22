import { and, desc, eq, gt } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '@/database/db'
import {
    type AssignableRole,
    type LedgerRole,
    ledgerInvitationsTable,
    ledgerMembersTable,
    ledgersTable,
    user
} from '@/database/schemas'
import { outranks } from '@/lib/ledger-access'
import nanoid from '@/lib/nanoid'
import * as HTTPStatus from '@/status-codes'

const INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 14

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

export type InviteResult =
    | { kind: 'joined'; userId: string; role: AssignableRole }
    | {
          kind: 'invited'
          invitation: typeof ledgerInvitationsTable.$inferSelect
      }

/**
 * Two paths, chosen by whether the address already has an account.
 *
 * No account -> create a shell `user` row plus the membership right away. They
 * are a member from this moment (shown as pending in the members list), and
 * better-auth links their Google account to that row on first sign-in.
 *
 * Account exists -> record a pending invitation they must accept or decline, so
 * existing users are not pulled into a ledger without consent.
 */
export async function invite(
    ledgerId: string,
    email: string,
    role: AssignableRole,
    actor: { userId: string; email: string; role: LedgerRole }
): Promise<InviteResult> {
    if (normalizeEmail(actor.email) === email) {
        throw new HTTPException(HTTPStatus.CONFLICT, {
            message: 'you are already a member of this ledger'
        })
    }

    if (!outranks(actor.role, role)) {
        throw new HTTPException(HTTPStatus.FORBIDDEN, {
            message: `you cannot invite someone as ${role}`
        })
    }

    const [existingUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email))
        .limit(1)

    if (existingUser) {
        const [membership] = await db
            .select({ id: ledgerMembersTable.id })
            .from(ledgerMembersTable)
            .where(
                and(
                    eq(ledgerMembersTable.ledgerId, ledgerId),
                    eq(ledgerMembersTable.userId, existingUser.id)
                )
            )
            .limit(1)

        if (membership) {
            throw new HTTPException(HTTPStatus.CONFLICT, {
                message: 'that person is already a member of this ledger'
            })
        }

        return {
            kind: 'invited',
            invitation: await upsertPendingInvitation(
                ledgerId,
                email,
                role,
                actor.userId
            )
        }
    }

    // No account: pre-create the user row so the membership can point at it.
    // This writes into better-auth's own table. It is bounded — the row has no
    // `account` and no password, so nobody can authenticate as it, and the real
    // owner of the address claims it on first Google sign-in.
    const userId = nanoid()

    try {
        await db.batch([
            db.insert(user).values({
                id: userId,
                // Placeholder; updateUserInfoOnLink replaces it with the real
                // Google profile when the account is linked.
                name: email.split('@')[0],
                email,
                emailVerified: false
            }),
            db.insert(ledgerMembersTable).values({ ledgerId, userId, role })
        ])
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to add that person to the ledger'
        })
    }

    return { kind: 'joined', userId, role }
}

async function upsertPendingInvitation(
    ledgerId: string,
    email: string,
    role: AssignableRole,
    invitedBy: string
) {
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS)

    const [pending] = await db
        .select()
        .from(ledgerInvitationsTable)
        .where(
            and(
                eq(ledgerInvitationsTable.ledgerId, ledgerId),
                eq(ledgerInvitationsTable.email, email),
                eq(ledgerInvitationsTable.status, 'pending')
            )
        )
        .limit(1)

    // ledger_invitations_pending_unique covers every pending row regardless of
    // expiry, so a lapsed invite must be refreshed in place rather than
    // re-inserted.
    if (pending) {
        if (pending.expiresAt > new Date()) {
            throw new HTTPException(HTTPStatus.CONFLICT, {
                message: 'that person already has a pending invitation'
            })
        }

        const [refreshed] = await db
            .update(ledgerInvitationsTable)
            .set({ role, invitedBy, expiresAt })
            .where(eq(ledgerInvitationsTable.id, pending.id))
            .returning()

        return refreshed
    }

    try {
        const [created] = await db
            .insert(ledgerInvitationsTable)
            .values({ ledgerId, email, role, invitedBy, expiresAt })
            .returning()

        return created
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to create the invitation'
        })
    }
}

export async function getLedgerInvitations(ledgerId: string) {
    return await db
        .select()
        .from(ledgerInvitationsTable)
        .where(eq(ledgerInvitationsTable.ledgerId, ledgerId))
        .orderBy(desc(ledgerInvitationsTable.createdAt))
}

export async function revoke(ledgerId: string, invitationId: string) {
    // Soft revoke: keeps the audit trail and makes a mid-flight accept fail
    // cleanly rather than silently succeeding against a deleted row.
    const [revoked] = await db
        .update(ledgerInvitationsTable)
        .set({ status: 'revoked', respondedAt: new Date() })
        .where(
            and(
                eq(ledgerInvitationsTable.id, invitationId),
                eq(ledgerInvitationsTable.ledgerId, ledgerId),
                eq(ledgerInvitationsTable.status, 'pending')
            )
        )
        .returning()

    if (!revoked) {
        throw new HTTPException(HTTPStatus.NOT_FOUND, {
            message: 'pending invitation not found'
        })
    }

    return { msg: 'invitation revoked' }
}

export async function getMyInvitations(email: string) {
    // Equality against the normalized column so ledger_invitations_email_index
    // is used — `lower(email) = ?` would defeat it.
    return await db
        .select({
            id: ledgerInvitationsTable.id,
            ledgerId: ledgerInvitationsTable.ledgerId,
            role: ledgerInvitationsTable.role,
            expiresAt: ledgerInvitationsTable.expiresAt,
            createdAt: ledgerInvitationsTable.createdAt,
            ledgerName: ledgersTable.name,
            invitedByName: user.name
        })
        .from(ledgerInvitationsTable)
        .innerJoin(
            ledgersTable,
            eq(ledgerInvitationsTable.ledgerId, ledgersTable.id)
        )
        .leftJoin(user, eq(ledgerInvitationsTable.invitedBy, user.id))
        .where(
            and(
                eq(ledgerInvitationsTable.email, normalizeEmail(email)),
                eq(ledgerInvitationsTable.status, 'pending'),
                gt(ledgerInvitationsTable.expiresAt, new Date())
            )
        )
        .orderBy(desc(ledgerInvitationsTable.createdAt))
}

async function getInvitationForEmail(invitationId: string, email: string) {
    const [invitation] = await db
        .select()
        .from(ledgerInvitationsTable)
        .where(eq(ledgerInvitationsTable.id, invitationId))
        .limit(1)

    // 404 rather than 403 for a mismatched email, so we do not confirm that an
    // invitation with this id exists.
    if (!invitation || invitation.email !== normalizeEmail(email)) {
        throw new HTTPException(HTTPStatus.NOT_FOUND, {
            message: 'invitation not found'
        })
    }

    if (invitation.status !== 'pending') {
        throw new HTTPException(HTTPStatus.CONFLICT, {
            message: 'this invitation is no longer available'
        })
    }

    return invitation
}

export async function accept(
    invitationId: string,
    actor: { userId: string; email: string }
) {
    const invitation = await getInvitationForEmail(invitationId, actor.email)

    if (invitation.expiresAt <= new Date()) {
        throw new HTTPException(HTTPStatus.GONE, {
            message: 'this invitation has expired'
        })
    }

    const [membership] = await db
        .select({ id: ledgerMembersTable.id })
        .from(ledgerMembersTable)
        .where(
            and(
                eq(ledgerMembersTable.ledgerId, invitation.ledgerId),
                eq(ledgerMembersTable.userId, actor.userId)
            )
        )
        .limit(1)

    // Idempotent: two tabs, or invited then added manually, must not 500 on
    // ledger_members_ledger_user_unique.
    if (membership) {
        await db
            .update(ledgerInvitationsTable)
            .set({ status: 'accepted', respondedAt: new Date() })
            .where(eq(ledgerInvitationsTable.id, invitation.id))

        return {
            ledgerId: invitation.ledgerId,
            role: invitation.role,
            alreadyMember: true
        }
    }

    try {
        await db.batch([
            db
                .update(ledgerInvitationsTable)
                .set({ status: 'accepted', respondedAt: new Date() })
                .where(eq(ledgerInvitationsTable.id, invitation.id)),
            db.insert(ledgerMembersTable).values({
                ledgerId: invitation.ledgerId,
                userId: actor.userId,
                role: invitation.role
            })
        ])
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to accept the invitation'
        })
    }

    return {
        ledgerId: invitation.ledgerId,
        role: invitation.role,
        alreadyMember: false
    }
}

export async function decline(invitationId: string, actor: { email: string }) {
    const invitation = await getInvitationForEmail(invitationId, actor.email)

    await db
        .update(ledgerInvitationsTable)
        .set({ status: 'declined', respondedAt: new Date() })
        .where(eq(ledgerInvitationsTable.id, invitation.id))

    return { msg: 'invitation declined' }
}
