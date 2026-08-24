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

/**
 * Pulls the `shell-link-attempt` cookie set on a shell-linking sign-up
 * response, formatted as a `Cookie` request header value. `req()` (see
 * `worker/test/factories.ts`) never forwards cookies from a prior response
 * automatically — a test must explicitly capture and pass this along to
 * simulate the same browser completing verification. Not calling this at
 * all, or not forwarding what it returns, simulates a *different*
 * browser/device — no `shell-link-attempt` cookie present.
 */
function shellLinkCookie(signUpRes: Response) {
    const setCookie = signUpRes.headers.get('set-cookie')
    const match = setCookie?.match(/shell-link-attempt=[^;]+/)
    if (!match) {
        throw new Error(
            'expected a shell-link-attempt cookie on the sign-up response'
        )
    }
    return match[0]
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

    test('shell user sign-up stages the credential without touching the database yet', async () => {
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
        // Synthetic id, not the real shell user's — nothing about the real
        // row is disclosed or touched by this call alone.
        expect(body.user.id).not.toBe(shellUser.id)

        const accountsBeforeVerify = await db
            .select()
            .from(account)
            .where(eq(account.userId, shellUser.id))
        expect(accountsBeforeVerify).toHaveLength(0)

        const [userBeforeVerify] = await db
            .select()
            .from(user)
            .where(eq(user.id, shellUser.id))
        expect(userBeforeVerify.name).toBe('Invited Person')
    })

    test('verifying the shell-linking email completes the link: credential appears and the placeholder name is replaced', async () => {
        const shellUser = await createUser({
            email: 'invited-verify@example.com',
            name: 'Invited Person',
            emailVerified: false
        })

        const signUpRes = await signUp({
            name: 'Real Name',
            email: shellUser.email,
            password: 'a-strong-password'
        })
        // Simulates the same browser: the cookie the sign-up response set
        // is forwarded to the verify-email request below.
        const cookie = shellLinkCookie(signUpRes)

        const token = await createEmailVerificationToken(
            env.BETTER_AUTH_SECRET,
            shellUser.email
        )
        await req(
            `/api/auth/verify-email?token=${token}&callbackURL=${encodeURIComponent('/verify-email')}`,
            { headers: { cookie } }
        )

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
        expect(updatedUser.emailVerified).toBe(true)

        const signInRes = await signIn({
            email: shellUser.email,
            password: 'a-strong-password'
        })
        expect(signInRes.status).toBe(200)
    })

    test("an attacker cannot plant a credential on someone else's shell account without proving ownership", async () => {
        const shellUser = await createUser({
            email: 'victim@example.com',
            name: 'Victim Name',
            emailVerified: false
        })

        // Attacker signs up with the victim's email and their own password —
        // no access to the victim's inbox.
        await signUp({
            name: 'Attacker Chosen Name',
            email: shellUser.email,
            password: 'attacker-password'
        })

        // Nothing was written to the database: no account, and the
        // placeholder name is untouched.
        const accounts = await db
            .select()
            .from(account)
            .where(eq(account.userId, shellUser.id))
        expect(accounts).toHaveLength(0)

        const [untouchedUser] = await db
            .select()
            .from(user)
            .where(eq(user.id, shellUser.id))
        expect(untouchedUser.name).toBe('Victim Name')

        // The attacker's password cannot be used to sign in, because it was
        // never actually linked.
        const attackerSignIn = await signIn({
            email: shellUser.email,
            password: 'attacker-password'
        })
        expect(attackerSignIn.status).not.toBe(200)

        // The real victim can still complete their own sign-up afterward —
        // the attacker's attempt didn't strand them in the duplicate branch,
        // because the shell condition (accounts.length === 0) still holds.
        const victimSignUp = await signUp({
            name: 'Victim Real Name',
            email: shellUser.email,
            password: 'victim-password'
        })
        expect(victimSignUp.status).toBe(200)
        // The victim's own sign-up, verified from their own browser: the
        // cookie their sign-up response set is forwarded here.
        const victimCookie = shellLinkCookie(victimSignUp)

        const victimToken = await createEmailVerificationToken(
            env.BETTER_AUTH_SECRET,
            shellUser.email
        )
        await req(
            `/api/auth/verify-email?token=${victimToken}&callbackURL=${encodeURIComponent('/verify-email')}`,
            { headers: { cookie: victimCookie } }
        )

        const victimSignIn = await signIn({
            email: shellUser.email,
            password: 'victim-password'
        })
        expect(victimSignIn.status).toBe(200)

        // And the attacker's stale password from their earlier attempt
        // still does not work.
        const attackerSignInAfter = await signIn({
            email: shellUser.email,
            password: 'attacker-password'
        })
        expect(attackerSignInAfter.status).not.toBe(200)
    })

    test('a genuine verification click from the victim does not link the attacker-staged credential (no linkAttemptId cookie forwarded)', async () => {
        const shellUser = await createUser({
            email: 'cookie-bound-victim@example.com',
            name: 'Victim Name',
            emailVerified: false
        })

        // Attacker stages a credential against the victim's shell row. This
        // response carries a `shell-link-attempt` cookie bound to the
        // attacker's own browser — deliberately never captured or
        // forwarded below, which is exactly what happens when the victim
        // opens the verification link on their own, different browser.
        const attackerSignUp = await signUp({
            name: 'Attacker Chosen Name',
            email: shellUser.email,
            password: 'attacker-password'
        })
        expect(attackerSignUp.status).toBe(200)

        // The victim receives a completely genuine verification email —
        // sent as an unavoidable side effect of the attacker's request
        // above — and clicks it from their own browser, which never had
        // the attacker's cookie. Minting the token directly (as the other
        // tests in this file do) and calling verify-email with no `cookie`
        // header accurately simulates that: `req()` never forwards cookies
        // from a prior response on its own (see `worker/test/factories.ts`).
        const token = await createEmailVerificationToken(
            env.BETTER_AUTH_SECRET,
            shellUser.email
        )
        const verifyRes = await req(
            `/api/auth/verify-email?token=${token}&callbackURL=${encodeURIComponent('/verify-email')}`
        )
        expect(verifyRes.status).toBeGreaterThanOrEqual(300)
        expect(verifyRes.status).toBeLessThan(400)

        // better-auth's own built-in handler still flips `emailVerified` —
        // that part is outside this hook's control and isn't what this fix
        // changes.
        const [verifiedUser] = await db
            .select()
            .from(user)
            .where(eq(user.id, shellUser.id))
        expect(verifiedUser.emailVerified).toBe(true)

        // But the attacker's password was never linked: verified but
        // unclaimed, not attacker-controlled.
        const accounts = await db
            .select()
            .from(account)
            .where(eq(account.userId, shellUser.id))
        expect(accounts).toHaveLength(0)

        const attackerSignIn = await signIn({
            email: shellUser.email,
            password: 'attacker-password'
        })
        expect(attackerSignIn.status).not.toBe(200)
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
