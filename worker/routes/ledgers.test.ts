import { beforeEach, describe, expect, test } from 'vitest'
import { createLedger, createUser, req } from '@/test/factories'
import { signInAs } from '@/test/mocks'

describe('GET /api/ledgers', () => {
    test('returns only the caller’s ledgers, each with its role', async () => {
        const alice = await createUser()
        const bob = await createUser()
        await createLedger({ owner: alice.id, name: 'Alice Ledger' })
        await createLedger({
            owner: bob.id,
            name: 'Bob Ledger',
            members: [{ userId: alice.id, role: 'viewer' }]
        })
        await createLedger({ owner: bob.id, name: 'Bob Only Ledger' })

        await signInAs(alice)
        const res = await req('/api/ledgers')

        expect(res.status).toBe(200)
        const ledgers = (await res.json()) as { name: string; role: string }[]
        expect(ledgers).toHaveLength(2)
        const byName = Object.fromEntries(
            ledgers.map(ledger => [ledger.name, ledger.role])
        )
        expect(byName['Alice Ledger']).toBe('owner')
        expect(byName['Bob Ledger']).toBe('viewer')
        expect(byName['Bob Only Ledger']).toBeUndefined()
    })

    test('ordered by updatedAt desc', async () => {
        const user = await createUser()
        await createLedger({ owner: user.id, name: 'First' })
        await createLedger({ owner: user.id, name: 'Second' })

        await signInAs(user)
        const res = await req('/api/ledgers')
        const ledgers = (await res.json()) as { name: string }[]

        expect(ledgers[0]?.name).toBe('Second')
        expect(ledgers[1]?.name).toBe('First')
    })
})

describe('POST /api/ledgers', () => {
    test('creates the ledger, owner membership and form in one batch', async () => {
        const user = await createUser()
        await signInAs(user)

        const res = await req('/api/ledgers', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'New Ledger' })
        })

        expect(res.status).toBe(201)
        const ledger = (await res.json()) as { id: string; role: string }
        expect(ledger.role).toBe('owner')

        await signInAs(user)
        const membersRes = await req(`/api/ledgers/${ledger.id}/members`)
        expect(await membersRes.json()).toHaveLength(1)

        await signInAs(user)
        const formRes = await req(`/api/ledgers/${ledger.id}/forms/schema`)
        expect(formRes.status).toBe(200)
    })
})

describe('PATCH /api/ledgers/:ledgerId', () => {
    let owner: Awaited<ReturnType<typeof createUser>>
    let admin: Awaited<ReturnType<typeof createUser>>
    let ledgerId: string

    beforeEach(async () => {
        owner = await createUser()
        admin = await createUser()
        ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: admin.id, role: 'admin' }]
        })
    })

    test('requires admin', async () => {
        await signInAs(admin)
        const res = await req(`/api/ledgers/${ledgerId}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'renamed' })
        })

        expect(res.status).toBe(200)
    })
})

describe('DELETE /api/ledgers/:ledgerId', () => {
    test('requires owner; admin gets 403', async () => {
        const owner = await createUser()
        const admin = await createUser()
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: admin.id, role: 'admin' }]
        })

        await signInAs(admin)
        const asAdmin = await req(`/api/ledgers/${ledgerId}`, {
            method: 'DELETE'
        })
        expect(asAdmin.status).toBe(403)

        await signInAs(owner)
        const asOwner = await req(`/api/ledgers/${ledgerId}`, {
            method: 'DELETE'
        })
        expect(asOwner.status).toBe(200)
    })
})

describe('POST /api/ledgers/:ledgerId/transfer', () => {
    test('happy path swaps the two roles', async () => {
        const owner = await createUser()
        const member = await createUser()
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: member.id, role: 'member' }]
        })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/transfer`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ userId: member.id })
        })

        expect(res.status).toBe(200)

        await signInAs(owner)
        const asFormerOwner = await req(`/api/ledgers/${ledgerId}`)
        expect(((await asFormerOwner.json()) as { role: string }).role).toBe(
            'admin'
        )

        await signInAs(member)
        const asNewOwner = await req(`/api/ledgers/${ledgerId}`)
        expect(((await asNewOwner.json()) as { role: string }).role).toBe(
            'owner'
        )
    })

    test('transferring to yourself is a 409', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/transfer`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ userId: owner.id })
        })

        expect(res.status).toBe(409)
    })

    test('transferring to a non-member is a 404', async () => {
        const owner = await createUser()
        const outsider = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/transfer`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ userId: outsider.id })
        })

        expect(res.status).toBe(404)
    })

    test('exactly one owner survives a transfer', async () => {
        const owner = await createUser()
        const member = await createUser()
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: member.id, role: 'member' }]
        })

        await signInAs(owner)
        await req(`/api/ledgers/${ledgerId}/transfer`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ userId: member.id })
        })

        await signInAs(member)
        const membersRes = await req(`/api/ledgers/${ledgerId}/members`)
        const members = (await membersRes.json()) as { role: string }[]
        const owners = members.filter(m => m.role === 'owner')
        expect(owners).toHaveLength(1)
    })
})

describe('POST /api/ledgers/:ledgerId/leave', () => {
    test('a member leaves successfully', async () => {
        const owner = await createUser()
        const member = await createUser()
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: member.id, role: 'member' }]
        })

        await signInAs(member)
        const res = await req(`/api/ledgers/${ledgerId}/leave`, {
            method: 'POST'
        })

        expect(res.status).toBe(200)
    })

    test('the owner gets 409', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/leave`, {
            method: 'POST'
        })

        expect(res.status).toBe(409)
        expect(((await res.json()) as { msg: string }).msg).toMatch(
            /transfer ownership or delete/
        )
    })
})
