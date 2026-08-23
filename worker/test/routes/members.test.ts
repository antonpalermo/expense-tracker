import { describe, expect, test } from 'vitest'
import {
    createAccountFor,
    createLedger,
    createUser,
    req
} from '@/test/factories'
import { signInAs } from '@/test/mocks'

type Member = {
    id: string
    userId: string
    role: string
    hasSignedIn: number
}

describe('GET /api/ledgers/:ledgerId/members', () => {
    test('hasSignedIn is derived from an account row, not emailVerified', async () => {
        const owner = await createUser()
        const signedIn = await createUser({ emailVerified: false })
        await createAccountFor(signedIn.id)
        const shell = await createUser({ emailVerified: false })

        const ledgerId = await createLedger({
            owner: owner.id,
            members: [
                { userId: signedIn.id, role: 'member' },
                { userId: shell.id, role: 'member' }
            ]
        })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/members`)

        expect(res.status).toBe(200)
        const members = (await res.json()) as Member[]
        const byUserId = Object.fromEntries(
            members.map(member => [member.userId, member.hasSignedIn])
        )

        expect(byUserId[signedIn.id]).toBe(1)
        expect(byUserId[shell.id]).toBe(0)
    })
})

describe('PATCH /api/ledgers/:ledgerId/members/:memberId', () => {
    async function setup() {
        const owner = await createUser()
        const admin = await createUser()
        const viewer = await createUser()
        const otherAdmin = await createUser()
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [
                { userId: admin.id, role: 'admin' },
                { userId: viewer.id, role: 'viewer' },
                { userId: otherAdmin.id, role: 'admin' }
            ]
        })

        const membersRes = await (async () => {
            await signInAs(owner)
            return req(`/api/ledgers/${ledgerId}/members`)
        })()
        const members = (await membersRes.json()) as Member[]
        const memberIdFor = (userId: string) =>
            members.find(member => member.userId === userId)?.id

        return {
            owner,
            admin,
            viewer,
            otherAdmin,
            ledgerId,
            memberIdFor
        }
    }

    test('admin can demote a viewer to viewer (no-op) or promote below own rank', async () => {
        const { admin, viewer, ledgerId, memberIdFor } = await setup()

        await signInAs(admin)
        const res = await req(
            `/api/ledgers/${ledgerId}/members/${memberIdFor(viewer.id)}`,
            {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ role: 'member' })
            }
        )

        expect(res.status).toBe(200)
    })

    test('admin cannot manage another admin (equal rank)', async () => {
        const { admin, otherAdmin, ledgerId, memberIdFor } = await setup()

        await signInAs(admin)
        const res = await req(
            `/api/ledgers/${ledgerId}/members/${memberIdFor(otherAdmin.id)}`,
            {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ role: 'viewer' })
            }
        )

        expect(res.status).toBe(403)
    })

    test('admin cannot manage the owner', async () => {
        const { admin, owner, ledgerId, memberIdFor } = await setup()

        await signInAs(admin)
        const res = await req(
            `/api/ledgers/${ledgerId}/members/${memberIdFor(owner.id)}`,
            {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ role: 'viewer' })
            }
        )

        expect(res.status).toBe(403)
    })

    test('admin cannot assign the admin role', async () => {
        const { admin, viewer, ledgerId, memberIdFor } = await setup()

        await signInAs(admin)
        const res = await req(
            `/api/ledgers/${ledgerId}/members/${memberIdFor(viewer.id)}`,
            {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ role: 'admin' })
            }
        )

        expect(res.status).toBe(403)
    })

    test('cannot change your own role', async () => {
        const { admin, ledgerId, memberIdFor } = await setup()

        await signInAs(admin)
        const res = await req(
            `/api/ledgers/${ledgerId}/members/${memberIdFor(admin.id)}`,
            {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ role: 'viewer' })
            }
        )

        // `updateRole` has a dedicated 409 for this ("you cannot change your
        // own role"), but `assertCanManage` runs first and always rejects a
        // self-change with the generic 403 first — you can never outrank
        // your own current role, so the 409 branch is unreachable as the
        // code is ordered today.
        expect(res.status).toBe(403)
    })
})

describe('DELETE /api/ledgers/:ledgerId/members/:memberId', () => {
    test('cannot remove yourself', async () => {
        const owner = await createUser()
        const admin = await createUser()
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: admin.id, role: 'admin' }]
        })

        await signInAs(admin)
        const membersRes = await req(`/api/ledgers/${ledgerId}/members`)
        const members = (await membersRes.json()) as Member[]
        const selfMemberId = members.find(
            member => member.userId === admin.id
        )?.id

        await signInAs(admin)
        const res = await req(
            `/api/ledgers/${ledgerId}/members/${selfMemberId}`,
            { method: 'DELETE' }
        )

        expect(res.status).toBe(409)
        expect(((await res.json()) as { msg: string }).msg).toMatch(/leave/)
    })

    test('cannot remove an equal or higher rank', async () => {
        const owner = await createUser()
        const admin = await createUser()
        const otherAdmin = await createUser()
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [
                { userId: admin.id, role: 'admin' },
                { userId: otherAdmin.id, role: 'admin' }
            ]
        })

        await signInAs(admin)
        const membersRes = await req(`/api/ledgers/${ledgerId}/members`)
        const members = (await membersRes.json()) as Member[]
        const otherAdminMemberId = members.find(
            member => member.userId === otherAdmin.id
        )?.id

        await signInAs(admin)
        const res = await req(
            `/api/ledgers/${ledgerId}/members/${otherAdminMemberId}`,
            { method: 'DELETE' }
        )

        expect(res.status).toBe(403)
    })

    test('owner can remove an admin', async () => {
        const owner = await createUser()
        const admin = await createUser()
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: admin.id, role: 'admin' }]
        })

        await signInAs(owner)
        const membersRes = await req(`/api/ledgers/${ledgerId}/members`)
        const members = (await membersRes.json()) as Member[]
        const adminMemberId = members.find(
            member => member.userId === admin.id
        )?.id

        await signInAs(owner)
        const res = await req(
            `/api/ledgers/${ledgerId}/members/${adminMemberId}`,
            { method: 'DELETE' }
        )

        expect(res.status).toBe(200)
    })
})

describe('POST /api/ledgers/:ledgerId/members/:memberId/resend', () => {
    test('returns 200 even though the outbound email send fails', async () => {
        const owner = await createUser()
        const shell = await createUser({ emailVerified: false })
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: shell.id, role: 'member' }]
        })

        await signInAs(owner)
        const membersRes = await req(`/api/ledgers/${ledgerId}/members`)
        const members = (await membersRes.json()) as Member[]
        const shellMemberId = members.find(
            member => member.userId === shell.id
        )?.id

        await signInAs(owner)
        // `PLUNK_SECRET_KEY` is a placeholder, so the real Plunk endpoint
        // rejects this with 401 — sendLedgerInvite must swallow that.
        const res = await req(
            `/api/ledgers/${ledgerId}/members/${shellMemberId}/resend`,
            { method: 'POST' }
        )

        expect(res.status).toBe(200)
    })
})
