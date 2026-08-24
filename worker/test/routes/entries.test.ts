import { describe, expect, test } from 'vitest'
import { createLedger, createUser, req } from '@/test/factories'
import { signInAs } from '@/test/mocks'

describe('requireLedgerRole on entries', () => {
    test('a viewer can read but not write', async () => {
        const owner = await createUser()
        const viewer = await createUser()
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: viewer.id, role: 'viewer' }]
        })

        await signInAs(viewer)
        const getRes = await req(`/api/ledgers/${ledgerId}/entries`)
        expect(getRes.status).toBe(200)

        await signInAs(viewer)
        const postRes = await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Coffee', amount: 5 })
        })
        expect(postRes.status).toBe(403)
    })

    test('a member can write', async () => {
        const owner = await createUser()
        const member = await createUser()
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: member.id, role: 'member' }]
        })

        await signInAs(member)
        const res = await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Coffee', amount: 5 })
        })
        expect(res.status).toBe(201)
    })
})

describe('cross-ledger scoping', () => {
    test('an entry id from another ledger 404s on GET, PATCH and DELETE', async () => {
        const owner = await createUser()
        const ledgerA = await createLedger({ owner: owner.id })
        const ledgerB = await createLedger({ owner: owner.id })

        await signInAs(owner)
        const createRes = await req(`/api/ledgers/${ledgerA}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Groceries', amount: 20 })
        })
        const entry = (await createRes.json()) as { id: string }

        await signInAs(owner)
        const getRes = await req(`/api/ledgers/${ledgerB}/entries/${entry.id}`)
        expect(getRes.status).toBe(404)

        await signInAs(owner)
        const patchRes = await req(
            `/api/ledgers/${ledgerB}/entries/${entry.id}`,
            {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ amount: 30 })
            }
        )
        expect(patchRes.status).toBe(404)

        await signInAs(owner)
        const deleteRes = await req(
            `/api/ledgers/${ledgerB}/entries/${entry.id}`,
            { method: 'DELETE' }
        )
        expect(deleteRes.status).toBe(404)
    })
})

describe('GET /api/ledgers/:ledgerId/entries', () => {
    test('ordered by createdAt desc', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'First', amount: 1 })
        })

        await signInAs(owner)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Second', amount: 2 })
        })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/entries`)
        const entries = (await res.json()) as { name: string }[]

        expect(entries[0]?.name).toBe('Second')
        expect(entries[1]?.name).toBe('First')
    })

    test('create with description omitted stores null', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'No description', amount: 3 })
        })

        expect(res.status).toBe(201)
        const entry = (await res.json()) as { description: string | null }
        expect(entry.description).toBeNull()
    })
})

describe('entry type is derived from the amount sign', () => {
    test('a negative amount is a debit, a positive amount is a credit', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        const debitRes = await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Coffee', amount: -5 })
        })
        expect(debitRes.status).toBe(201)
        expect(((await debitRes.json()) as { type: string }).type).toBe('debit')

        await signInAs(owner)
        const creditRes = await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Refund', amount: 5 })
        })
        expect(creditRes.status).toBe(201)
        expect(((await creditRes.json()) as { type: string }).type).toBe(
            'credit'
        )
    })

    test('patching the amount across zero flips the type', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        const createRes = await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Groceries', amount: -20 })
        })
        const entry = (await createRes.json()) as { id: string; type: string }
        expect(entry.type).toBe('debit')

        await signInAs(owner)
        const patchRes = await req(
            `/api/ledgers/${ledgerId}/entries/${entry.id}`,
            {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ amount: 20 })
            }
        )
        expect(((await patchRes.json()) as { type: string }).type).toBe(
            'credit'
        )
    })

    test('a patch that omits the amount leaves the type untouched', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        const createRes = await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Rent', amount: -1000 })
        })
        const entry = (await createRes.json()) as { id: string }

        await signInAs(owner)
        const patchRes = await req(
            `/api/ledgers/${ledgerId}/entries/${entry.id}`,
            {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ name: 'Monthly rent' })
            }
        )
        const patched = (await patchRes.json()) as {
            name: string
            type: string
        }
        expect(patched.name).toBe('Monthly rent')
        expect(patched.type).toBe('debit')
    })
})
