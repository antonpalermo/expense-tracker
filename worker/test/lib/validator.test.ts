import { Hono } from 'hono'
import { describe, expect, test } from 'vitest'
import { z } from 'zod'
import { createInvitationSchema } from '@/database/schemas'
import { validate } from '@/lib/validator'

const someSchema = z.object({ name: z.string().min(1) })

function makeApp() {
    const app = new Hono()
    app.post('/', validate('json', someSchema), ctx => {
        return ctx.json(ctx.req.valid('json'))
    })
    return app
}

describe('validate', () => {
    test('a bad body returns 400 with { msg, issues }', async () => {
        const app = makeApp()

        const res = await app.request('/', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: '' })
        })

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('msg')
        expect(body).toHaveProperty('issues')
    })

    test('a valid body passes through parsed', async () => {
        const app = makeApp()

        const res = await app.request('/', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'hello' })
        })

        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ name: 'hello' })
    })
})

describe('createInvitationSchema', () => {
    test('lowercases the email before it ever reaches the DB', () => {
        const parsed = createInvitationSchema.parse({
            email: 'Foo.Bar@Example.COM'
        })

        expect(parsed.email).toBe('foo.bar@example.com')
    })

    test('defaults role to member', () => {
        const parsed = createInvitationSchema.parse({
            email: 'a@example.com'
        })

        expect(parsed.role).toBe('member')
    })
})
