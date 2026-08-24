import { eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'
import { db } from '@/database/db'
import { user } from '@/database/schemas'
import * as HTTPStatus from '@/status-codes'
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
        const body = (await res.json()) as { data: { name: string }[] }

        expect(body.data[0]?.name).toBe('Second')
        expect(body.data[1]?.name).toBe('First')
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

describe('entry author is joined into the list response', () => {
    test('the list carries the author name and image', async () => {
        const owner = await createUser({
            name: 'Ada Lovelace',
            image: 'https://example.com/ada.png'
        })
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Books', amount: -30 })
        })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/entries`)
        const body = (await res.json()) as {
            data: {
                userId: string | null
                authorName: string | null
                authorImage: string | null
            }[]
        }

        expect(body.data).toHaveLength(1)
        expect(body.data[0]?.userId).toBe(owner.id)
        expect(body.data[0]?.authorName).toBe('Ada Lovelace')
        expect(body.data[0]?.authorImage).toBe('https://example.com/ada.png')
    })

    test('an entry whose author was deleted is still listed, with a null author', async () => {
        const owner = await createUser()
        const author = await createUser({ name: 'Departing Member' })
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: author.id, role: 'member' }]
        })

        await signInAs(author)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Orphaned', amount: -7 })
        })

        // `entries.user_id` is `on delete set null` on purpose — deleting a
        // user must not delete the ledger's history. A join that drops the
        // row would silently lose it.
        await db.delete(user).where(eq(user.id, author.id))

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/entries`)
        const body = (await res.json()) as {
            data: {
                name: string
                userId: string | null
                authorName: string | null
            }[]
        }

        expect(body.data).toHaveLength(1)
        expect(body.data[0]?.name).toBe('Orphaned')
        expect(body.data[0]?.userId).toBeNull()
        expect(body.data[0]?.authorName).toBeNull()
    })
})

describe('GET /api/ledgers/:ledgerId/entries — search, sort, filter, pagination', () => {
    test('q matches the entry name', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Coffee run', amount: -5 })
        })
        await signInAs(owner)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Groceries', amount: -40 })
        })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/entries?q=coffee`)
        const body = (await res.json()) as {
            data: { name: string }[]
            total: number
        }

        expect(body.total).toBe(1)
        expect(body.data[0]?.name).toBe('Coffee run')
    })

    test('q matches the entry description', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                name: 'Utility',
                description: 'March electricity bill',
                amount: -60
            })
        })
        await signInAs(owner)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Other', amount: -10 })
        })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/entries?q=electricity`)
        const body = (await res.json()) as {
            data: { name: string }[]
            total: number
        }

        expect(body.total).toBe(1)
        expect(body.data[0]?.name).toBe('Utility')
    })

    test('q matches the author name', async () => {
        const owner = await createUser({ name: 'Ada Lovelace' })
        const other = await createUser({ name: 'Grace Hopper' })
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: other.id, role: 'member' }]
        })

        await signInAs(owner)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Owner entry', amount: -1 })
        })
        await signInAs(other)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Member entry', amount: -2 })
        })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/entries?q=Hopper`)
        const body = (await res.json()) as {
            data: { name: string }[]
            total: number
        }

        expect(body.total).toBe(1)
        expect(body.data[0]?.name).toBe('Member entry')
    })

    test('authorIds filters to the selected members, and an id with no entries returns empty', async () => {
        const owner = await createUser()
        const author = await createUser()
        const bystander = await createUser()
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [
                { userId: author.id, role: 'member' },
                { userId: bystander.id, role: 'member' }
            ]
        })

        await signInAs(author)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Author entry', amount: -3 })
        })
        await signInAs(owner)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Owner entry', amount: -4 })
        })

        await signInAs(owner)
        const filtered = await req(
            `/api/ledgers/${ledgerId}/entries?authorIds=${encodeURIComponent(
                JSON.stringify([author.id])
            )}`
        )
        const filteredBody = (await filtered.json()) as {
            data: { name: string }[]
            total: number
        }
        expect(filteredBody.total).toBe(1)
        expect(filteredBody.data[0]?.name).toBe('Author entry')

        await signInAs(owner)
        const empty = await req(
            `/api/ledgers/${ledgerId}/entries?authorIds=${encodeURIComponent(
                JSON.stringify([bystander.id])
            )}`
        )
        const emptyBody = (await empty.json()) as {
            data: unknown[]
            total: number
        }
        expect(emptyBody.total).toBe(0)
        expect(emptyBody.data).toHaveLength(0)
    })

    test('sort=amount orders ascending and descending', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        for (const amount of [-30, -10, -20]) {
            await signInAs(owner)
            await req(`/api/ledgers/${ledgerId}/entries`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ name: `Entry ${amount}`, amount })
            })
        }

        await signInAs(owner)
        const asc = await req(
            `/api/ledgers/${ledgerId}/entries?sort=amount&order=asc`
        )
        const ascBody = (await asc.json()) as { data: { amount: number }[] }
        expect(ascBody.data.map(entry => entry.amount)).toEqual([-30, -20, -10])

        await signInAs(owner)
        const desc = await req(
            `/api/ledgers/${ledgerId}/entries?sort=amount&order=desc`
        )
        const descBody = (await desc.json()) as { data: { amount: number }[] }
        expect(descBody.data.map(entry => entry.amount)).toEqual([
            -10, -20, -30
        ])
    })

    test('sort=name orders alphabetically', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        for (const name of ['Zebra', 'Apple', 'Mango']) {
            await signInAs(owner)
            await req(`/api/ledgers/${ledgerId}/entries`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ name, amount: -1 })
            })
        }

        await signInAs(owner)
        const res = await req(
            `/api/ledgers/${ledgerId}/entries?sort=name&order=asc`
        )
        const body = (await res.json()) as { data: { name: string }[] }
        expect(body.data.map(entry => entry.name)).toEqual([
            'Apple',
            'Mango',
            'Zebra'
        ])
    })

    test('an invalid sort value is rejected', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        const res = await req(
            `/api/ledgers/${ledgerId}/entries?sort=notAColumn`
        )
        expect(res.status).toBe(HTTPStatus.BAD_REQUEST)
    })

    test('pagination returns the requested page and correct metadata', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        for (let i = 0; i < 25; i++) {
            await signInAs(owner)
            await req(`/api/ledgers/${ledgerId}/entries`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ name: `Entry ${i}`, amount: -1 })
            })
        }

        await signInAs(owner)
        const page1 = await req(`/api/ledgers/${ledgerId}/entries`)
        const page1Body = (await page1.json()) as {
            data: unknown[]
            page: number
            pageSize: number
            total: number
            totalPages: number
        }
        expect(page1Body.data).toHaveLength(20)
        expect(page1Body.page).toBe(1)
        expect(page1Body.pageSize).toBe(20)
        expect(page1Body.total).toBe(25)
        expect(page1Body.totalPages).toBe(2)

        await signInAs(owner)
        const page2 = await req(`/api/ledgers/${ledgerId}/entries?page=2`)
        const page2Body = (await page2.json()) as { data: unknown[] }
        expect(page2Body.data).toHaveLength(5)

        await signInAs(owner)
        const page3 = await req(`/api/ledgers/${ledgerId}/entries?page=3`)
        const page3Body = (await page3.json()) as {
            data: unknown[]
            total: number
        }
        expect(page3Body.data).toHaveLength(0)
        expect(page3Body.total).toBe(25)
    })

    test('combining q, authorIds, sort and page narrows correctly', async () => {
        const owner = await createUser()
        const author = await createUser()
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: author.id, role: 'member' }]
        })

        await signInAs(author)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Team lunch', amount: -20 })
        })
        await signInAs(author)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Team dinner', amount: -40 })
        })
        await signInAs(owner)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Team snacks', amount: -5 })
        })

        await signInAs(owner)
        const res = await req(
            `/api/ledgers/${ledgerId}/entries?q=team&authorIds=${encodeURIComponent(
                JSON.stringify([author.id])
            )}&sort=amount&order=desc&page=1`
        )
        const body = (await res.json()) as {
            data: { name: string }[]
            total: number
        }

        expect(body.total).toBe(2)
        expect(body.data.map(entry => entry.name)).toEqual([
            'Team lunch',
            'Team dinner'
        ])
    })
})
