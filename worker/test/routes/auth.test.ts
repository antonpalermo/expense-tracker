import { env } from 'cloudflare:test'
import { createEmailVerificationToken } from 'better-auth/api'
import { eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'
import { db } from '@/database/db'
import { account, user, verification } from '@/database/schemas'
import { createAccountFor, createUser, req } from '@/test/factories'

function signUp(body: { name: string; email: string; password: string }) {
    return req('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
    })
}

function signIn(body: { email: string; password: string }) {
    return req('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
    })
}

describe('POST /api/auth/sign-up/email', () => {
    test('creates an unverified user and a credential account; sign-in is blocked until verified', async () => {
        const email = 'new-signup@example.com'

        const signUpRes = await signUp({
            name: 'New Signup',
            email,
            password: 'a-strong-password'
        })
        expect(signUpRes.status).toBe(200)

        const [createdUser] = await db
            .select()
            .from(user)
            .where(eq(user.email, email))
        expect(createdUser.emailVerified).toBe(false)

        const accounts = await db
            .select()
            .from(account)
            .where(eq(account.userId, createdUser.id))
        expect(accounts).toHaveLength(1)
        expect(accounts[0].providerId).toBe('credential')

        const blockedSignIn = await signIn({
            email,
            password: 'a-strong-password'
        })
        expect(blockedSignIn.status).toBe(403)

        const token = await createEmailVerificationToken(
            env.BETTER_AUTH_SECRET,
            email
        )
        const verifyRes = await req(
            `/api/auth/verify-email?token=${token}&callbackURL=${encodeURIComponent('/verify-email')}`
        )
        expect(verifyRes.status).toBeGreaterThanOrEqual(300)
        expect(verifyRes.status).toBeLessThan(400)

        const [verifiedUser] = await db
            .select()
            .from(user)
            .where(eq(user.email, email))
        expect(verifiedUser.emailVerified).toBe(true)

        const allowedSignIn = await signIn({
            email,
            password: 'a-strong-password'
        })
        expect(allowedSignIn.status).toBe(200)
    })

    test('links to an existing shell user instead of returning a synthetic duplicate', async () => {
        const shellUser = await createUser({
            email: 'invited@example.com',
            name: 'Invited Person',
            emailVerified: false
        })

        const res = await signUp({
            name: 'Real Name',
            email: shellUser.email,
            password: 'a-strong-password'
        })

        expect(res.status).toBe(200)
        const body = (await res.json()) as { user: { id: string } }
        expect(body.user.id).toBe(shellUser.id)

        const accounts = await db
            .select()
            .from(account)
            .where(eq(account.userId, shellUser.id))
        expect(accounts).toHaveLength(1)
        expect(accounts[0].providerId).toBe('credential')

        const [updatedUser] = await db
            .select()
            .from(user)
            .where(eq(user.id, shellUser.id))
        expect(updatedUser.name).toBe('Real Name')
    })

    test('an email with an already-linked account gets the generic duplicate response', async () => {
        const existing = await createUser({
            email: 'already-linked@example.com'
        })
        await createAccountFor(existing.id)

        const res = await signUp({
            name: 'Someone Else',
            email: existing.email,
            password: 'a-strong-password'
        })

        expect(res.status).toBe(200)
        const body = (await res.json()) as { user: { id: string } }
        expect(body.user.id).not.toBe(existing.id)

        const accounts = await db
            .select()
            .from(account)
            .where(eq(account.userId, existing.id))
        expect(accounts).toHaveLength(1)
        expect(accounts[0].providerId).toBe('google')
    })
})

describe('password reset', () => {
    test('happy path changes the credential and allows sign-in with the new password', async () => {
        const email = 'reset-flow@example.com'

        await signUp({
            name: 'Reset Flow',
            email,
            password: 'original-password'
        })

        const verifyToken = await createEmailVerificationToken(
            env.BETTER_AUTH_SECRET,
            email
        )
        await req(
            `/api/auth/verify-email?token=${verifyToken}&callbackURL=${encodeURIComponent('/verify-email')}`
        )

        const requestRes = await req('/api/auth/request-password-reset', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email })
        })
        expect(requestRes.status).toBe(200)

        const verificationRows = await db.select().from(verification)
        const resetRow = verificationRows.find(row =>
            row.identifier.startsWith('reset-password:')
        )
        if (!resetRow) {
            throw new Error('expected a reset-password verification row')
        }
        const resetToken = resetRow.identifier.replace('reset-password:', '')

        const resetRes = await req('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                newPassword: 'a-new-password',
                token: resetToken
            })
        })
        expect(resetRes.status).toBe(200)

        const oldPasswordSignIn = await signIn({
            email,
            password: 'original-password'
        })
        expect(oldPasswordSignIn.status).toBe(401)

        const newPasswordSignIn = await signIn({
            email,
            password: 'a-new-password'
        })
        expect(newPasswordSignIn.status).toBe(200)
    })
})
