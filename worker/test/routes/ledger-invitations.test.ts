import { eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'
import { db } from '@/database/db'
import { user as userTable } from '@/database/schemas'
import {
    createInvitation,
    createLedger,
    createUser,
    req
} from '@/test/factories'
import { signInAs } from '@/test/mocks'

describe('POST /api/ledgers/:ledgerId/invitations', () => {
    test('inviting an address with no account creates a shell user and an immediate membership', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/invitations`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: 'newperson@example.com' })
        })

        expect(res.status).toBe(201)
        const body = (await res.json()) as { kind: string; userId: string }
        expect(body.kind).toBe('joined')

        const [shell] = await db
            .select()
            .from(userTable)
            .where(eq(userTable.id, body.userId))
        expect(shell?.emailVerified).toBe(false)
        expect(shell?.name).toBe('newperson')

        await signInAs(owner)
        const membersRes = await req(`/api/ledgers/${ledgerId}/members`)
        const members = (await membersRes.json()) as { userId: string }[]
        expect(members.some(member => member.userId === body.userId)).toBe(true)
    })

    test('inviting an address with an existing account creates a pending invitation, not a membership', async () => {
        const owner = await createUser()
        const invitee = await createUser({ email: 'existing@example.com' })
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/invitations`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: invitee.email })
        })

        expect(res.status).toBe(201)
        const body = (await res.json()) as { kind: string }
        expect(body.kind).toBe('invited')

        await signInAs(owner)
        const membersRes = await req(`/api/ledgers/${ledgerId}/members`)
        const members = (await membersRes.json()) as { userId: string }[]
        expect(members.some(member => member.userId === invitee.id)).toBe(false)
    })

    test('inviting yourself is a 409', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/invitations`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: owner.email })
        })

        expect(res.status).toBe(409)
    })

    test('inviting an existing member is a 409', async () => {
        const owner = await createUser()
        const member = await createUser()
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: member.id, role: 'member' }]
        })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/invitations`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: member.email })
        })

        expect(res.status).toBe(409)
    })

    test('inviting at or above your own rank is a 403', async () => {
        const owner = await createUser()
        const admin = await createUser()
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: admin.id, role: 'admin' }]
        })

        await signInAs(admin)
        const res = await req(`/api/ledgers/${ledgerId}/invitations`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                email: 'someone@example.com',
                role: 'admin'
            })
        })

        expect(res.status).toBe(403)
    })

    test('re-inviting while a live pending invitation exists is a 409', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })
        await createUser({ email: 'existing2@example.com' })

        await signInAs(owner)
        await req(`/api/ledgers/${ledgerId}/invitations`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: 'existing2@example.com' })
        })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/invitations`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: 'existing2@example.com' })
        })

        expect(res.status).toBe(409)
    })

    test('re-inviting after the pending invitation expired refreshes it in place', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })
        await createUser({ email: 'existing3@example.com' })
        await createInvitation({
            ledgerId,
            email: 'existing3@example.com',
            expiresAt: new Date(Date.now() - 1000)
        })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/invitations`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: 'existing3@example.com' })
        })

        expect(res.status).toBe(201)

        await signInAs(owner)
        const listRes = await req(`/api/ledgers/${ledgerId}/invitations`)
        const invitations = (await listRes.json()) as {
            email: string
            status: string
        }[]
        const forEmail = invitations.filter(
            invitation => invitation.email === 'existing3@example.com'
        )
        expect(forEmail).toHaveLength(1)
        expect(forEmail[0]?.status).toBe('pending')
    })
})

describe('GET /api/ledgers/:ledgerId/invitations', () => {
    test('lists this ledger’s invitations for an admin', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })
        await createInvitation({ ledgerId, email: 'a@example.com' })
        await createInvitation({ ledgerId, email: 'b@example.com' })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/invitations`)

        expect(res.status).toBe(200)
        expect(await res.json()).toHaveLength(2)
    })
})

describe('DELETE /api/ledgers/:ledgerId/invitations/:invitationId', () => {
    test('revokes a pending invitation, and it can then be re-issued', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })
        const invitation = await createInvitation({
            ledgerId,
            email: 'revoke-me@example.com'
        })

        await signInAs(owner)
        const revokeRes = await req(
            `/api/ledgers/${ledgerId}/invitations/${invitation.id}`,
            { method: 'DELETE' }
        )
        expect(revokeRes.status).toBe(200)

        await signInAs(owner)
        const revokeAgainRes = await req(
            `/api/ledgers/${ledgerId}/invitations/${invitation.id}`,
            { method: 'DELETE' }
        )
        expect(revokeAgainRes.status).toBe(404)

        await signInAs(owner)
        const reinviteRes = await req(`/api/ledgers/${ledgerId}/invitations`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: 'revoke-me@example.com' })
        })
        expect(reinviteRes.status).toBe(201)
    })
})
