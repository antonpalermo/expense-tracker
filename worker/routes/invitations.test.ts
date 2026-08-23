import { describe, expect, test } from 'vitest'
import {
    createInvitation,
    createLedger,
    createUser,
    req
} from '@/test/factories'
import { signInAs } from '@/test/mocks'

describe('GET /api/invitations', () => {
    test('lists only pending, unexpired invitations for the caller’s email', async () => {
        const owner = await createUser()
        const invitee = await createUser({ email: 'invitee@example.com' })
        // The pending-per-ledger-per-email unique index covers expired rows
        // too, so the pending/declined/expired fixtures each need their own
        // ledger to coexist.
        const ledgerId = await createLedger({ owner: owner.id })
        const declinedLedgerId = await createLedger({ owner: owner.id })
        const expiredLedgerId = await createLedger({ owner: owner.id })

        await createInvitation({ ledgerId, email: invitee.email })
        await createInvitation({
            ledgerId: declinedLedgerId,
            email: invitee.email,
            status: 'declined'
        })
        await createInvitation({
            ledgerId: expiredLedgerId,
            email: invitee.email,
            expiresAt: new Date(Date.now() - 1000)
        })
        await createInvitation({ ledgerId, email: 'someone-else@example.com' })

        await signInAs(invitee)
        const res = await req('/api/invitations')

        expect(res.status).toBe(200)
        expect(await res.json()).toHaveLength(1)
    })
})

describe('POST /api/invitations/:invitationId/accept', () => {
    test('happy path creates the membership and flips status to accepted', async () => {
        const owner = await createUser()
        const invitee = await createUser({ email: 'accept@example.com' })
        const ledgerId = await createLedger({ owner: owner.id })
        const invitation = await createInvitation({
            ledgerId,
            email: invitee.email
        })

        await signInAs(invitee)
        const res = await req(`/api/invitations/${invitation.id}/accept`, {
            method: 'POST'
        })

        expect(res.status).toBe(200)
        const body = (await res.json()) as {
            alreadyMember: boolean
            ledgerId: string
        }
        expect(body.alreadyMember).toBe(false)
        expect(body.ledgerId).toBe(ledgerId)

        await signInAs(owner)
        const membersRes = await req(`/api/ledgers/${ledgerId}/members`)
        const members = (await membersRes.json()) as { userId: string }[]
        expect(members.some(member => member.userId === invitee.id)).toBe(true)
    })

    test('an expired invitation is a 410', async () => {
        const owner = await createUser()
        const invitee = await createUser({ email: 'expired@example.com' })
        const ledgerId = await createLedger({ owner: owner.id })
        const invitation = await createInvitation({
            ledgerId,
            email: invitee.email,
            expiresAt: new Date(Date.now() - 1000)
        })

        await signInAs(invitee)
        const res = await req(`/api/invitations/${invitation.id}/accept`, {
            method: 'POST'
        })

        expect(res.status).toBe(410)
    })

    test('a mismatched email is a 404, not 403', async () => {
        const owner = await createUser()
        const invitee = await createUser({ email: 'real@example.com' })
        const impostor = await createUser({ email: 'impostor@example.com' })
        const ledgerId = await createLedger({ owner: owner.id })
        const invitation = await createInvitation({
            ledgerId,
            email: invitee.email
        })

        await signInAs(impostor)
        const res = await req(`/api/invitations/${invitation.id}/accept`, {
            method: 'POST'
        })

        expect(res.status).toBe(404)
    })

    test('an already-accepted invitation is a 409', async () => {
        const owner = await createUser()
        const invitee = await createUser({ email: 'already@example.com' })
        const ledgerId = await createLedger({ owner: owner.id })
        const invitation = await createInvitation({
            ledgerId,
            email: invitee.email,
            status: 'accepted'
        })

        await signInAs(invitee)
        const res = await req(`/api/invitations/${invitation.id}/accept`, {
            method: 'POST'
        })

        expect(res.status).toBe(409)
    })

    test('accepting while already a member succeeds with alreadyMember: true', async () => {
        const owner = await createUser()
        const invitee = await createUser({
            email: 'already-member@example.com'
        })
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: invitee.id, role: 'member' }]
        })
        const invitation = await createInvitation({
            ledgerId,
            email: invitee.email
        })

        await signInAs(invitee)
        const res = await req(`/api/invitations/${invitation.id}/accept`, {
            method: 'POST'
        })

        expect(res.status).toBe(200)
        const body = (await res.json()) as { alreadyMember: boolean }
        expect(body.alreadyMember).toBe(true)
    })
})

describe('POST /api/invitations/:invitationId/decline', () => {
    test('flips status to declined', async () => {
        const owner = await createUser()
        const invitee = await createUser({ email: 'decline@example.com' })
        const ledgerId = await createLedger({ owner: owner.id })
        const invitation = await createInvitation({
            ledgerId,
            email: invitee.email
        })

        await signInAs(invitee)
        const res = await req(`/api/invitations/${invitation.id}/decline`, {
            method: 'POST'
        })

        expect(res.status).toBe(200)

        await signInAs(invitee)
        const listRes = await req('/api/invitations')
        expect(await listRes.json()).toHaveLength(0)
    })
})
