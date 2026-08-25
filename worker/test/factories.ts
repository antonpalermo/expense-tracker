import { db } from '@/database/db'
import type { LedgerRole } from '@/database/schemas'
import {
    account,
    entriesTable,
    entryTypeFor,
    formTable,
    ledgerInvitationsTable,
    ledgerMembersTable,
    ledgersTable,
    user
} from '@/database/schemas'
import app from '@/index'
import nanoid from '@/lib/nanoid'
import { createBlankFields } from '@/services/forms'
import { authHeaders } from './mocks'

export async function createUser(
    overrides?: Partial<typeof user.$inferInsert>
) {
    const id = overrides?.id ?? nanoid()

    const [created] = await db
        .insert(user)
        .values({
            id,
            name: overrides?.name ?? 'Test User',
            email: overrides?.email ?? `${id.toLowerCase()}@example.com`,
            emailVerified: overrides?.emailVerified ?? true,
            image: overrides?.image ?? null
        })
        .returning()

    return created
}

export async function createAccountFor(userId: string) {
    const [created] = await db
        .insert(account)
        .values({
            id: nanoid(),
            accountId: userId,
            providerId: 'google',
            userId
        })
        .returning()

    return created
}

export async function createLedger(options: {
    owner: string
    name?: string
    members?: { userId: string; role: LedgerRole }[]
}) {
    const ledgerId = nanoid()

    await db.batch([
        db.insert(ledgersTable).values({
            id: ledgerId,
            name: options.name ?? 'Test Ledger',
            createdBy: options.owner
        }),
        db
            .insert(ledgerMembersTable)
            .values({ ledgerId, userId: options.owner, role: 'owner' }),
        db.insert(formTable).values({ ledgerId, fields: createBlankFields() })
    ])

    if (options.members?.length) {
        await db
            .insert(ledgerMembersTable)
            .values(options.members.map(member => ({ ledgerId, ...member })))
    }

    return ledgerId
}

export async function createEntry(options: {
    ledgerId: string
    userId?: string | null
    name?: string
    amount: number
    createdAt?: Date
}) {
    const [created] = await db
        .insert(entriesTable)
        .values({
            ledgerId: options.ledgerId,
            userId: options.userId ?? null,
            name: options.name ?? 'Test entry',
            amount: options.amount,
            type: entryTypeFor(options.amount),
            ...(options.createdAt ? { createdAt: options.createdAt } : {})
        })
        .returning()

    return created
}

export async function createInvitation(options: {
    ledgerId: string
    email: string
    role?: 'viewer' | 'member' | 'admin'
    invitedBy?: string
    status?: 'pending' | 'accepted' | 'declined' | 'revoked'
    expiresAt?: Date
}) {
    const [created] = await db
        .insert(ledgerInvitationsTable)
        .values({
            ledgerId: options.ledgerId,
            email: options.email,
            role: options.role ?? 'member',
            status: options.status ?? 'pending',
            invitedBy: options.invitedBy ?? null,
            expiresAt:
                options.expiresAt ??
                new Date(Date.now() + 1000 * 60 * 60 * 24 * 14)
        })
        .returning()

    return created
}

/** Thin wrapper over `app.request()` so tests exercise the real router. */
export function req(path: string, init?: RequestInit) {
    return app.request(path, {
        ...init,
        headers: { ...authHeaders(), ...init?.headers }
    })
}
