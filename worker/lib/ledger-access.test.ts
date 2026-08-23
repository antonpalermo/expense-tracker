import { describe, expect, test } from 'vitest'
import type { LedgerRole } from '@/database/schemas'
import { createLedger, createUser, req } from '@/test/factories'
import { signInAs } from '@/test/mocks'
import { hasRole, outranks, ROLE_RANK } from './ledger-access'

const ROLES: LedgerRole[] = ['viewer', 'member', 'admin', 'owner']

describe('hasRole', () => {
    for (const role of ROLES) {
        for (const required of ROLES) {
            test(`${role} ${ROLE_RANK[role] >= ROLE_RANK[required] ? 'satisfies' : 'does not satisfy'} ${required}`, () => {
                expect(hasRole(role, required)).toBe(
                    ROLE_RANK[role] >= ROLE_RANK[required]
                )
            })
        }
    }

    test('owner has every role', () => {
        expect(hasRole('owner', 'viewer')).toBe(true)
        expect(hasRole('owner', 'owner')).toBe(true)
    })
})

describe('outranks', () => {
    for (const actor of ROLES) {
        for (const target of ROLES) {
            test(`${actor} ${ROLE_RANK[actor] > ROLE_RANK[target] ? 'outranks' : 'does not outrank'} ${target}`, () => {
                expect(outranks(actor, target)).toBe(
                    ROLE_RANK[actor] > ROLE_RANK[target]
                )
            })
        }
    }

    test('equal ranks never outrank each other', () => {
        expect(outranks('admin', 'admin')).toBe(false)
        expect(outranks('owner', 'owner')).toBe(false)
    })
})

describe('requireLedgerRole', () => {
    test('non-member gets 404, not 403', async () => {
        const owner = await createUser()
        const outsider = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(outsider)
        const res = await req(`/api/ledgers/${ledgerId}`)

        expect(res.status).toBe(404)
        expect(((await res.json()) as { msg: string }).msg).toBe(
            'ledger not found'
        )
    })

    test('a non-existent ledger id is indistinguishable from non-membership', async () => {
        const user = await createUser()
        await signInAs(user)

        const res = await req('/api/ledgers/does-not-exist')

        expect(res.status).toBe(404)
        expect(((await res.json()) as { msg: string }).msg).toBe(
            'ledger not found'
        )
    })

    test('a member below the required rank gets 403', async () => {
        const owner = await createUser()
        const viewer = await createUser()
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: viewer.id, role: 'viewer' }]
        })

        await signInAs(viewer)
        const res = await req(`/api/ledgers/${ledgerId}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'renamed' })
        })

        expect(res.status).toBe(403)
        expect(((await res.json()) as { msg: string }).msg).toBe(
            'this action requires the admin role'
        )
    })

    test('no session gets 401', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(null)
        const res = await req(`/api/ledgers/${ledgerId}`)

        expect(res.status).toBe(401)
    })

    test('/api/auth/* bypasses the session check', async () => {
        await signInAs(null)
        const res = await req('/api/auth/get-session')

        expect(res.status).not.toBe(401)
    })

    test('ctx.get("ledgerRole") reaches the handler', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}`)

        expect(res.status).toBe(200)
        expect(((await res.json()) as { role: string }).role).toBe('owner')
    })
})
