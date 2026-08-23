import { env } from 'cloudflare:test'
import { describe, expect, test } from 'vitest'
import type { FormSchema } from '@/bindings'
import { formConfigKey } from '@/services/forms'
import { createLedger, createUser, req } from '@/test/factories'
import { signInAs } from '@/test/mocks'

describe('GET /api/ledgers/:ledgerId/forms/schema', () => {
    test('a cold cache reads D1 and populates KV', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        expect(await env.APP_CACHE.get(formConfigKey(ledgerId))).toBeNull()

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/forms/schema`)

        expect(res.status).toBe(200)
        const cached = await env.APP_CACHE.get<FormSchema>(
            formConfigKey(ledgerId),
            'json'
        )
        expect(cached?.fields).toHaveLength(3)
    })

    test('a warm cache is served from KV verbatim', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        const sentinel: FormSchema = {
            fields: [
                { uid: 'sentinel', name: 'Sentinel', type: 'text', default: '' }
            ],
            schema: { sentinel: '' }
        }
        await env.APP_CACHE.put(
            formConfigKey(ledgerId),
            JSON.stringify(sentinel)
        )

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/forms/schema`)

        expect(res.status).toBe(200)
        expect(await res.json()).toEqual(sentinel)
    })
})

describe('PATCH /api/ledgers/:ledgerId/forms/schema', () => {
    test('requires admin', async () => {
        const owner = await createUser()
        const member = await createUser()
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: member.id, role: 'member' }]
        })

        await signInAs(member)
        const res = await req(`/api/ledgers/${ledgerId}/forms/schema`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                name: 'Category',
                type: 'text',
                default: ''
            })
        })

        expect(res.status).toBe(403)
    })

    test('appends a field, assigns a uid, and write-through refreshes KV', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/forms/schema`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                name: 'Category',
                type: 'text',
                default: ''
            })
        })

        expect(res.status).toBe(200)
        const body = (await res.json()) as FormSchema
        const added = body.fields.find(field => field.name === 'Category')
        expect(added?.uid).toBeTruthy()
        expect(body.fields).toHaveLength(4)

        const cached = await env.APP_CACHE.get<FormSchema>(
            formConfigKey(ledgerId),
            'json'
        )
        expect(cached?.fields.some(field => field.name === 'Category')).toBe(
            true
        )
    })

    test('the `.where` regression guard: adding a field to one ledger leaves another untouched', async () => {
        const owner = await createUser()
        const ledgerA = await createLedger({ owner: owner.id })
        const ledgerB = await createLedger({ owner: owner.id })

        await signInAs(owner)
        await req(`/api/ledgers/${ledgerA}/forms/schema`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                name: 'Only On A',
                type: 'text',
                default: ''
            })
        })

        await signInAs(owner)
        const bRes = await req(`/api/ledgers/${ledgerB}/forms/schema`)
        const bBody = (await bRes.json()) as FormSchema

        expect(bBody.fields).toHaveLength(3)
        expect(bBody.fields.some(field => field.name === 'Only On A')).toBe(
            false
        )
    })

    test('buildSchema maps uid to default in the schema object', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/forms/schema`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                name: 'Category',
                type: 'text',
                default: 'general'
            })
        })

        const body = (await res.json()) as FormSchema
        const added = body.fields.find(field => field.name === 'Category')
        expect(added).toBeDefined()
        expect(body.schema[added?.uid ?? '']).toBe('general')
    })
})
