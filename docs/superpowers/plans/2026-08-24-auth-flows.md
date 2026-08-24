# Auth Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add email/password registration, login, password reset, and required email verification alongside the existing Google OAuth, and close the `_auth` route-guard gap (redirect signed-in users away from sign-in/sign-up).

**Architecture:** `better-auth`'s built-in `emailAndPassword`/`emailVerification` config handles the standard flows almost entirely declaratively. The one piece that needs custom code is a `hooks.before` interceptor on `/sign-up/email` that links a password credential to an invite-created "shell" user instead of letting better-auth's anti-enumeration default silently no-op that case. The frontend wires the already-scaffolded `_auth` pages to the `better-auth` React client and adds three new pages (forgot-password, reset-password, verify-email landing).

**Tech Stack:** `better-auth` 1.6.24 (Hono-mounted at `/api/auth/*`), Drizzle/D1, `@tanstack/react-router` + `@tanstack/react-form`, Plunk (existing transactional-email seam), Vitest + `@cloudflare/vitest-pool-workers`.

**Spec:** `docs/superpowers/specs/2026-08-24-auth-flows-design.md`

## Global Constraints

- Google OAuth stays exactly as configured today — do not remove `account.accountLinking` (`trustedProviders: ['google']`, `updateUserInfoOnLink: true`); ledger invites depend on it.
- `requireEmailVerification: true` — an email/password account cannot sign in until verified.
- Verification and password-reset email sends must **swallow failures** (log via `console.error`, request still succeeds) — matching `sendLedgerInvite`'s existing convention. `PLUNK_SECRET_KEY` is a placeholder in tests, so every send genuinely fails there.
- No server-side rendering / server-rendered route gate — out of scope (see spec's Non-goals). The `worker/lib/session.ts` middleware is the real security boundary for all `/api/*` data.
- Formatting: 4-space indent, single quotes, no semicolons, no trailing commas (Biome, runs automatically via the pre-commit hook — do not hand-format against this).
- Run `bun run test` (worker) after backend changes and `bun run build` before every commit (`tsc -b` typechecks test files too).

---

## Task 1: Backend — email/password auth, verification, shell-user linking

**Files:**
- Modify: `worker/lib/email.ts`
- Modify: `worker/lib/auth.ts`
- Test: `worker/test/routes/auth.test.ts` (new)

**Interfaces:**
- Produces: `POST /api/auth/sign-up/email`, `POST /api/auth/sign-in/email`, `GET /api/auth/verify-email`, `POST /api/auth/request-password-reset`, `POST /api/auth/reset-password` — all via `better-auth`'s built-in handler (already forwarded by `worker/routes/auth.ts`, unchanged). `sendVerificationEmail(payload: { to: string; url: string })` and `sendPasswordResetEmail(payload: { to: string; url: string })` exported from `worker/lib/email.ts`.
- Consumes: `worker/test/factories.ts`'s `createUser`, `createAccountFor`, `req`; `worker/database/schemas`' `user`, `account`, `verification` tables.

### Step 1: Write the failing tests

Create `worker/test/routes/auth.test.ts`:

```ts
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
```

### Step 2: Run the tests and confirm they fail

Run: `bun run test worker/test/routes/auth.test.ts`
Expected: every test fails — sign-up currently returns 400 (`EMAIL_PASSWORD_SIGN_UP_DISABLED`) because `emailAndPassword` isn't enabled yet.

### Step 3: Add the email-sending functions

Replace the full contents of `worker/lib/email.ts` with:

```ts
import { env } from 'cloudflare:workers'

/**
 * Delivery seam for transactional email, backed by Plunk's transactional
 * send API (https://docs.useplunk.com/api-reference/transactional/send).
 * Raw fetch rather than the Plunk SDK, to keep this a one-file dependency
 * and the Worker bundle small.
 *
 * Callers must never let a send failure fail the request: whatever the send
 * is attached to (a membership row, a new account, a reset token) is already
 * committed and usable without the email arriving.
 */

const PLUNK_SEND_URL = 'https://api.useplunk.com/v1/send'

async function sendPlunkEmail(payload: {
    to: string
    subject: string
    body: string
}) {
    const response = await fetch(PLUNK_SEND_URL, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${env.PLUNK_SECRET_KEY}`
        },
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        throw new Error(
            `plunk send failed: ${response.status} ${await response.text()}`
        )
    }
}

type LedgerInviteEmail = {
    to: string
    ledgerName: string
    inviterName: string
    url: string
    /**
     * 'join' — the address had no account, a membership was created for it and
     * signing in with Google claims it.
     * 'review' — the address already has an account and a pending invitation is
     * waiting to be accepted or declined.
     */
    kind: 'join' | 'review'
}

export async function sendLedgerInvite(payload: LedgerInviteEmail) {
    const subject =
        payload.kind === 'join'
            ? `${payload.inviterName} added you to ${payload.ledgerName}`
            : `${payload.inviterName} invited you to ${payload.ledgerName}`

    const lede =
        payload.kind === 'join'
            ? `added you to <strong>${escapeHtml(payload.ledgerName)}</strong>. Sign in with Google to get started.`
            : `invited you to join <strong>${escapeHtml(payload.ledgerName)}</strong>. Accept or decline below.`

    const cta = payload.kind === 'join' ? 'Sign in' : 'Review invitation'

    await sendPlunkEmail({
        to: payload.to,
        subject,
        body: [
            `<p>${escapeHtml(payload.inviterName)} ${lede}</p>`,
            `<p><a href="${payload.url}">${cta}</a></p>`
        ].join('\n')
    })
}

type VerificationEmail = {
    to: string
    url: string
}

export async function sendVerificationEmail(payload: VerificationEmail) {
    await sendPlunkEmail({
        to: payload.to,
        subject: 'Verify your email',
        body: [
            '<p>Confirm your email address to finish setting up your xpens account.</p>',
            `<p><a href="${payload.url}">Verify email</a></p>`
        ].join('\n')
    })
}

type PasswordResetEmail = {
    to: string
    url: string
}

export async function sendPasswordResetEmail(payload: PasswordResetEmail) {
    await sendPlunkEmail({
        to: payload.to,
        subject: 'Reset your password',
        body: [
            '<p>Reset your xpens password. This link expires in 1 hour.</p>',
            `<p><a href="${payload.url}">Reset password</a></p>`
        ].join('\n')
    })
}

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}
```

This factors the three functions' shared fetch/error logic into `sendPlunkEmail` (used by `sendLedgerInvite` too) rather than tripling it — same behavior as before for `sendLedgerInvite`, just de-duplicated.

### Step 4: Wire up `emailAndPassword` / `emailVerification` and the shell-user linking hook

Replace the full contents of `worker/lib/auth.ts` with:

```ts
import { env } from 'cloudflare:workers'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import {
    APIError,
    createAuthMiddleware,
    createEmailVerificationToken
} from 'better-auth/api'
import { db } from '@/database/db'
import { sendPasswordResetEmail, sendVerificationEmail } from '@/lib/email'

import * as authSchema from '@/database/schemas/auth'

export const auth = betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
        provider: 'sqlite',
        schema: authSchema
    }),
    socialProviders: {
        google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET
        }
    },
    // Ledger invites for an unregistered address pre-create a shell `user` row.
    // These settings are what make that row get claimed on first Google sign-in
    // instead of failing with `account_not_linked`, and what replaces the
    // placeholder name with the real Google profile.
    account: {
        accountLinking: {
            enabled: true,
            trustedProviders: ['google'],
            updateUserInfoOnLink: true
        }
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        sendResetPassword: async ({ user, url }) => {
            try {
                await sendPasswordResetEmail({ to: user.email, url })
            } catch (error) {
                console.error('[email] password reset send failed', error)
            }
        }
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
            try {
                await sendVerificationEmail({ to: user.email, url })
            } catch (error) {
                console.error('[email] verification send failed', error)
            }
        }
    },
    // A shell user created by a ledger invite (see above) has no `account`
    // row yet. better-auth's default sign-up handler, with
    // `requireEmailVerification` on, treats ANY existing email as a generic
    // duplicate and returns a synthetic response without touching the
    // database (anti-enumeration) — which would silently strand an invited
    // person who tries to register with a password instead of Google. This
    // hook intercepts `/sign-up/email` before that happens: if the email
    // belongs to a shell user (no linked accounts), it links the credential
    // itself instead of falling through to the duplicate-response path.
    hooks: {
        before: createAuthMiddleware(async ctx => {
            if (ctx.path !== '/sign-up/email') {
                return
            }

            const body = ctx.body as
                | { name?: unknown; email?: unknown; password?: unknown }
                | undefined

            if (
                typeof body?.email !== 'string' ||
                typeof body?.password !== 'string' ||
                typeof body?.name !== 'string'
            ) {
                return
            }

            const normalizedEmail = body.email.toLowerCase()
            const existing =
                await ctx.context.internalAdapter.findUserByEmail(
                    normalizedEmail,
                    { includeAccounts: true }
                )

            // No existing user, or a real duplicate (already has a linked
            // account) — let the built-in handler take it from here.
            if (!existing || existing.accounts.length > 0) {
                return
            }

            const { minPasswordLength, maxPasswordLength } =
                ctx.context.password.config

            if (body.password.length < minPasswordLength) {
                throw APIError.from('BAD_REQUEST', {
                    message: 'Password is too short'
                })
            }

            if (body.password.length > maxPasswordLength) {
                throw APIError.from('BAD_REQUEST', {
                    message: 'Password is too long'
                })
            }

            const hash = await ctx.context.password.hash(body.password)

            await ctx.context.internalAdapter.linkAccount({
                userId: existing.user.id,
                providerId: 'credential',
                accountId: existing.user.id,
                password: hash
            })

            const updatedUser = await ctx.context.internalAdapter.updateUser(
                existing.user.id,
                { name: body.name }
            )

            const token = await createEmailVerificationToken(
                ctx.context.secret,
                normalizedEmail,
                undefined,
                ctx.context.options.emailVerification?.expiresIn
            )
            const url = `${ctx.context.baseURL}/verify-email?token=${token}&callbackURL=${encodeURIComponent('/verify-email')}`

            await ctx.context.options.emailVerification?.sendVerificationEmail?.(
                { user: updatedUser, url, token },
                ctx.request
            )

            return ctx.json({
                token: null,
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    emailVerified: updatedUser.emailVerified,
                    createdAt: updatedUser.createdAt,
                    updatedAt: updatedUser.updatedAt
                }
            })
        })
    }
})
```

### Step 5: Run the tests and confirm they pass

Run: `bun run test worker/test/routes/auth.test.ts`
Expected: all four tests pass. (`sendVerificationEmail`/`sendPasswordResetEmail` will log a swallowed Plunk 401 to the console during the run — that's expected per the Global Constraints, not a failure.)

### Step 6: Full verification and commit

Run: `bun run test` (whole suite — confirms nothing else regressed) and `bun run build` (typechecks).

```bash
git add worker/lib/email.ts worker/lib/auth.ts worker/test/routes/auth.test.ts
git commit -m "feat(worker): add email/password auth, verification, and shell-user linking"
```

---

## Task 2: Frontend — sign-in page

**Files:**
- Modify: `app/lib/auth.ts`
- Modify: `app/routes/_auth/sign-in.tsx`

**Interfaces:**
- Consumes: `useAppForm` from `app/hooks/form.ts`; `Field`/`FieldLabel`/`FieldError`/`FieldGroup`/`FieldSeparator`/`FieldDescription` from `app/components/ui/field.tsx`; `Button`/`Input` from `app/components/ui`.
- Produces: `app/lib/auth.ts` additionally exports `sendVerificationEmail`, `requestPasswordReset`, `resetPassword` (used by Tasks 4 and this task). `sign-in.tsx`'s `Route` now has `validateSearch: z.object({ redirect: z.string().optional() })`, consumed by `_dashboard/route.tsx`'s existing `redirect({ to: '/sign-in', search: { redirect: location.href } })`.

### Step 1: Extend the auth client's exports

Replace the full contents of `app/lib/auth.ts`:

```ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()
export const {
    signIn,
    signOut,
    signUp,
    useSession,
    sendVerificationEmail,
    requestPasswordReset,
    resetPassword
} = authClient
```

### Step 2: Wire the sign-in page

Replace the full contents of `app/routes/_auth/sign-in.tsx`:

```tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldSeparator
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAppForm } from '@/hooks/form'
import { sendVerificationEmail, signIn } from '@/lib/auth'

const schema = z.object({
    email: z.email('Enter a valid email'),
    password: z.string().min(1, 'Password is required')
})

export const Route = createFileRoute('/_auth/sign-in')({
    validateSearch: z.object({ redirect: z.string().optional() }),
    component: RouteComponent
})

function RouteComponent() {
    const navigate = useNavigate()
    const { redirect } = Route.useSearch()
    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(
        null
    )

    const form = useAppForm({
        defaultValues: { email: '', password: '' },
        validators: { onSubmit: schema },
        onSubmit: async ({ value }) => {
            setUnverifiedEmail(null)

            await signIn.email({
                email: value.email,
                password: value.password,
                fetchOptions: {
                    onSuccess: async () => {
                        await navigate(
                            redirect ? { href: redirect } : { to: '/' }
                        )
                    },
                    onError: ctx => {
                        if (ctx.error.status === 403) {
                            setUnverifiedEmail(value.email)
                            return
                        }
                        toast.error(ctx.error.message)
                    }
                }
            })
        }
    })

    const resendVerification = async () => {
        if (!unverifiedEmail) {
            return
        }

        await sendVerificationEmail({
            email: unverifiedEmail,
            callbackURL: '/verify-email',
            fetchOptions: {
                onSuccess: () => toast.success('Verification email sent'),
                onError: ctx => toast.error(ctx.error.message)
            }
        })
    }

    return (
        <div>
            <form
                onSubmit={e => {
                    e.preventDefault()
                    form.handleSubmit()
                }}
            >
                <FieldGroup>
                    <div className="flex flex-col items-center gap-1 text-center">
                        <h1 className="text-2xl font-bold">Sign In</h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            Enter your email below to sign in to your account
                        </p>
                    </div>
                    <form.Field name="email">
                        {field => {
                            const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid

                            return (
                                <Field data-invalid={isInvalid}>
                                    <FieldLabel htmlFor={field.name}>
                                        Email
                                    </FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        type="email"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={e =>
                                            field.handleChange(
                                                e.currentTarget.value
                                            )
                                        }
                                        aria-invalid={isInvalid}
                                        placeholder="m@example.com"
                                    />
                                    {isInvalid && (
                                        <FieldError
                                            errors={field.state.meta.errors}
                                        />
                                    )}
                                </Field>
                            )
                        }}
                    </form.Field>
                    <form.Field name="password">
                        {field => {
                            const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid

                            return (
                                <Field data-invalid={isInvalid}>
                                    <div className="flex items-center">
                                        <FieldLabel htmlFor={field.name}>
                                            Password
                                        </FieldLabel>
                                        <Link
                                            to="/forgot-password"
                                            className="ml-auto text-sm underline-offset-4 hover:underline"
                                        >
                                            Forgot your password?
                                        </Link>
                                    </div>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        type="password"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={e =>
                                            field.handleChange(
                                                e.currentTarget.value
                                            )
                                        }
                                        aria-invalid={isInvalid}
                                        placeholder="Password"
                                    />
                                    {isInvalid && (
                                        <FieldError
                                            errors={field.state.meta.errors}
                                        />
                                    )}
                                </Field>
                            )
                        }}
                    </form.Field>
                    {unverifiedEmail && (
                        <Field>
                            <FieldDescription>
                                Your email isn&apos;t verified yet.{' '}
                                <button
                                    type="button"
                                    onClick={resendVerification}
                                    className="underline underline-offset-4"
                                >
                                    Resend verification email
                                </button>
                            </FieldDescription>
                        </Field>
                    )}
                    <Field>
                        <Button type="submit">Sign in</Button>
                    </Field>
                    <FieldSeparator>Or continue with</FieldSeparator>
                    <Field>
                        <Button
                            variant="outline"
                            type="button"
                            onClick={async () =>
                                await signIn.social({ provider: 'google' })
                            }
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                                    fill="currentColor"
                                />
                            </svg>
                            Sign in with Google
                        </Button>
                        <FieldDescription className="text-center">
                            Don&apos;t have an account?{' '}
                            <Link
                                to="/sign-up"
                                className="underline underline-offset-4"
                            >
                                Sign up
                            </Link>
                        </FieldDescription>
                    </Field>
                </FieldGroup>
            </form>
        </div>
    )
}
```

(The Google button's existing SVG stays as-is; only its label text changes from the mislabeled "Sign in with GitHub" to "Sign in with Google" — it was already calling `signIn.social({ provider: 'google' })`.)

### Step 3: Manual verification

Run `bun run dev`, then in a browser:
- Go to `/sign-in`. Try submitting with an invalid email / empty password — inline `FieldError`s should appear.
- There is no email/password account yet (Task 3 adds sign-up), so full end-to-end sign-in can't be exercised until after Task 3 — for now confirm the page renders, validation works, and the Google button still calls `signIn.social`.

### Step 4: Typecheck and commit

Run: `bun run build`

```bash
git add app/lib/auth.ts app/routes/_auth/sign-in.tsx
git commit -m "feat(app): wire the sign-in page to email/password auth"
```

---

## Task 3: Frontend — sign-up page

**Files:**
- Modify: `app/routes/_auth/sign-up.tsx`

**Interfaces:**
- Consumes: `signUp`, `signIn` from `app/lib/auth.ts` (Task 2).

### Step 1: Wire the sign-up page

Replace the full contents of `app/routes/_auth/sign-up.tsx`:

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldSeparator
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAppForm } from '@/hooks/form'
import { signIn, signUp } from '@/lib/auth'

const schema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(80),
    email: z.email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters')
})

export const Route = createFileRoute('/_auth/sign-up')({
    component: RouteComponent
})

function RouteComponent() {
    const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

    const form = useAppForm({
        defaultValues: { name: '', email: '', password: '' },
        validators: { onSubmit: schema },
        onSubmit: async ({ value }) => {
            await signUp.email({
                name: value.name,
                email: value.email,
                password: value.password,
                callbackURL: '/verify-email',
                fetchOptions: {
                    onSuccess: () => setSubmittedEmail(value.email),
                    onError: ctx => toast.error(ctx.error.message)
                }
            })
        }
    })

    if (submittedEmail) {
        return (
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Check your email</h1>
                <p className="text-sm text-balance text-muted-foreground">
                    We sent a verification link to {submittedEmail}. Click it
                    to finish setting up your account.
                </p>
                <Link
                    to="/sign-in"
                    className="text-sm underline underline-offset-4"
                >
                    Back to sign in
                </Link>
            </div>
        )
    }

    return (
        <div>
            <form
                onSubmit={e => {
                    e.preventDefault()
                    form.handleSubmit()
                }}
            >
                <FieldGroup>
                    <div className="flex flex-col items-center gap-1 text-center">
                        <h1 className="text-2xl font-bold">Sign Up</h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            Enter your email below to create your account
                        </p>
                    </div>
                    <form.Field name="name">
                        {field => {
                            const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid

                            return (
                                <Field data-invalid={isInvalid}>
                                    <FieldLabel htmlFor={field.name}>
                                        Name
                                    </FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={e =>
                                            field.handleChange(
                                                e.currentTarget.value
                                            )
                                        }
                                        aria-invalid={isInvalid}
                                        placeholder="Jane Doe"
                                    />
                                    {isInvalid && (
                                        <FieldError
                                            errors={field.state.meta.errors}
                                        />
                                    )}
                                </Field>
                            )
                        }}
                    </form.Field>
                    <form.Field name="email">
                        {field => {
                            const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid

                            return (
                                <Field data-invalid={isInvalid}>
                                    <FieldLabel htmlFor={field.name}>
                                        Email
                                    </FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        type="email"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={e =>
                                            field.handleChange(
                                                e.currentTarget.value
                                            )
                                        }
                                        aria-invalid={isInvalid}
                                        placeholder="m@example.com"
                                    />
                                    {isInvalid && (
                                        <FieldError
                                            errors={field.state.meta.errors}
                                        />
                                    )}
                                </Field>
                            )
                        }}
                    </form.Field>
                    <form.Field name="password">
                        {field => {
                            const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid

                            return (
                                <Field data-invalid={isInvalid}>
                                    <FieldLabel htmlFor={field.name}>
                                        Password
                                    </FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        type="password"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={e =>
                                            field.handleChange(
                                                e.currentTarget.value
                                            )
                                        }
                                        aria-invalid={isInvalid}
                                        placeholder="Password"
                                    />
                                    {isInvalid && (
                                        <FieldError
                                            errors={field.state.meta.errors}
                                        />
                                    )}
                                </Field>
                            )
                        }}
                    </form.Field>
                    <Field>
                        <Button type="submit">Sign up</Button>
                    </Field>
                    <FieldSeparator>Or continue with</FieldSeparator>
                    <Field>
                        <Button
                            variant="outline"
                            type="button"
                            onClick={async () =>
                                await signIn.social({ provider: 'google' })
                            }
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                                    fill="currentColor"
                                />
                            </svg>
                            Sign up with Google
                        </Button>
                        <FieldDescription className="text-center">
                            Already have an account?{' '}
                            <Link
                                to="/sign-in"
                                className="underline underline-offset-4"
                            >
                                Sign In
                            </Link>
                        </FieldDescription>
                    </Field>
                </FieldGroup>
            </form>
        </div>
    )
}
```

Note: a duplicate email also lands in `onSuccess` (better-auth's anti-enumeration synthetic response is a 200, not an error) — the "check your email" confirmation shows either way, which is the correct behavior (it doesn't reveal whether the account already existed).

### Step 2: Manual verification

Run `bun run dev`, then in a browser:
- Go to `/sign-up`, submit a new name/email/password. Confirm the "Check your email" state appears.
- Check the worker's console output (the `[email] verification send failed` log, since Plunk isn't configured locally either) to find the generated verification URL isn't logged — instead, query the local D1 `verification` table isn't practical by hand; use the worker test suite (Task 1) as the source of truth for the token flow, and here just confirm the UI states render correctly and no console errors appear.
- Go back to `/sign-in` and confirm the email/password just created is rejected with "resend verification" showing (403 path from Task 2).

### Step 3: Typecheck and commit

Run: `bun run build`

```bash
git add app/routes/_auth/sign-up.tsx
git commit -m "feat(app): wire the sign-up page to email/password auth"
```

---

## Task 4: Frontend — forgot-password and reset-password pages

**Files:**
- Create: `app/routes/_auth/forgot-password.tsx`
- Create: `app/routes/_auth/reset-password.tsx`

**Interfaces:**
- Consumes: `requestPasswordReset`, `resetPassword` from `app/lib/auth.ts` (Task 2).

### Step 1: Create the forgot-password page

Create `app/routes/_auth/forgot-password.tsx`:

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAppForm } from '@/hooks/form'
import { requestPasswordReset } from '@/lib/auth'

const schema = z.object({
    email: z.email('Enter a valid email')
})

export const Route = createFileRoute('/_auth/forgot-password')({
    component: RouteComponent
})

function RouteComponent() {
    const [submitted, setSubmitted] = useState(false)

    const form = useAppForm({
        defaultValues: { email: '' },
        validators: { onSubmit: schema },
        onSubmit: async ({ value }) => {
            await requestPasswordReset({
                email: value.email,
                redirectTo: '/reset-password',
                fetchOptions: {
                    onSuccess: () => setSubmitted(true),
                    onError: ctx => toast.error(ctx.error.message)
                }
            })
        }
    })

    if (submitted) {
        return (
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Check your email</h1>
                <p className="text-sm text-balance text-muted-foreground">
                    If that email has an account, we sent a link to reset
                    your password.
                </p>
                <Link
                    to="/sign-in"
                    className="text-sm underline underline-offset-4"
                >
                    Back to sign in
                </Link>
            </div>
        )
    }

    return (
        <div>
            <form
                onSubmit={e => {
                    e.preventDefault()
                    form.handleSubmit()
                }}
            >
                <FieldGroup>
                    <div className="flex flex-col items-center gap-1 text-center">
                        <h1 className="text-2xl font-bold">
                            Forgot password
                        </h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            Enter your email and we&apos;ll send you a reset
                            link
                        </p>
                    </div>
                    <form.Field name="email">
                        {field => {
                            const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid

                            return (
                                <Field data-invalid={isInvalid}>
                                    <FieldLabel htmlFor={field.name}>
                                        Email
                                    </FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        type="email"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={e =>
                                            field.handleChange(
                                                e.currentTarget.value
                                            )
                                        }
                                        aria-invalid={isInvalid}
                                        placeholder="m@example.com"
                                    />
                                    {isInvalid && (
                                        <FieldError
                                            errors={field.state.meta.errors}
                                        />
                                    )}
                                </Field>
                            )
                        }}
                    </form.Field>
                    <Field>
                        <Button type="submit">Send reset link</Button>
                    </Field>
                    <FieldDescription className="text-center">
                        <Link
                            to="/sign-in"
                            className="underline underline-offset-4"
                        >
                            Back to sign in
                        </Link>
                    </FieldDescription>
                </FieldGroup>
            </form>
        </div>
    )
}
```

### Step 2: Create the reset-password page

Create `app/routes/_auth/reset-password.tsx`:

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAppForm } from '@/hooks/form'
import { resetPassword } from '@/lib/auth'

const schema = z.object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters')
})

export const Route = createFileRoute('/_auth/reset-password')({
    validateSearch: z.object({
        token: z.string().optional(),
        error: z.string().optional()
    }),
    component: RouteComponent
})

function RouteComponent() {
    const navigate = useNavigate()
    const { token, error } = Route.useSearch()

    const form = useAppForm({
        defaultValues: { newPassword: '' },
        validators: { onSubmit: schema },
        onSubmit: async ({ value }) => {
            if (!token) {
                return
            }

            await resetPassword({
                newPassword: value.newPassword,
                token,
                fetchOptions: {
                    onSuccess: async () => {
                        toast.success(
                            'Password reset. Sign in with your new password.'
                        )
                        await navigate({ to: '/sign-in' })
                    },
                    onError: ctx => toast.error(ctx.error.message)
                }
            })
        }
    })

    if (!token || error) {
        return (
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Link expired</h1>
                <p className="text-sm text-balance text-muted-foreground">
                    This password reset link is invalid or has expired.
                    Request a new one from the sign-in page.
                </p>
            </div>
        )
    }

    return (
        <div>
            <form
                onSubmit={e => {
                    e.preventDefault()
                    form.handleSubmit()
                }}
            >
                <FieldGroup>
                    <div className="flex flex-col items-center gap-1 text-center">
                        <h1 className="text-2xl font-bold">
                            Reset password
                        </h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            Enter a new password for your account
                        </p>
                    </div>
                    <form.Field name="newPassword">
                        {field => {
                            const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid

                            return (
                                <Field data-invalid={isInvalid}>
                                    <FieldLabel htmlFor={field.name}>
                                        New password
                                    </FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        type="password"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={e =>
                                            field.handleChange(
                                                e.currentTarget.value
                                            )
                                        }
                                        aria-invalid={isInvalid}
                                        placeholder="Password"
                                    />
                                    {isInvalid && (
                                        <FieldError
                                            errors={field.state.meta.errors}
                                        />
                                    )}
                                </Field>
                            )
                        }}
                    </form.Field>
                    <Field>
                        <Button type="submit">Reset password</Button>
                    </Field>
                </FieldGroup>
            </form>
        </div>
    )
}
```

### Step 3: Manual verification

Run `bun run dev`:
- Go to `/forgot-password`, submit any email — confirm the generic "check your email" confirmation shows regardless of whether the account exists (try both a real and a fake email).
- Go to `/reset-password` directly with no `token` — confirm the "Link expired" state shows.
- The full token round-trip (`/reset-password?token=...`) is covered by Task 1's worker test; manually exercising it would require reading the token out of a real email, which Plunk isn't configured to send locally. Skip that leg here and trust the automated coverage.

### Step 4: Typecheck and commit

Run: `bun run build`

```bash
git add app/routes/_auth/forgot-password.tsx app/routes/_auth/reset-password.tsx
git commit -m "feat(app): add forgot-password and reset-password pages"
```

---

## Task 5: Frontend — verify-email landing page

**Files:**
- Create: `app/routes/_auth/verify-email.tsx`

**Interfaces:**
- Consumes: nothing new — this is the `callbackURL` target used by Tasks 1 and 3's verification links (`/verify-email?error=...` on failure, `/verify-email` with no params on success, per `better-auth`'s `/verify-email` redirect behavior).

### Step 1: Create the page

Create `app/routes/_auth/verify-email.tsx`:

```tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { z } from 'zod'

export const Route = createFileRoute('/_auth/verify-email')({
    validateSearch: z.object({ error: z.string().optional() }),
    component: RouteComponent
})

function RouteComponent() {
    const navigate = useNavigate()
    const { error } = Route.useSearch()

    useEffect(() => {
        if (error) {
            return
        }

        const timeout = setTimeout(() => {
            navigate({ to: '/' })
        }, 1500)

        return () => clearTimeout(timeout)
    }, [error, navigate])

    if (error) {
        return (
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Verification failed</h1>
                <p className="text-sm text-balance text-muted-foreground">
                    This verification link is invalid or has expired. Sign in
                    and use &quot;Resend verification email&quot; to get a
                    new one.
                </p>
                <Link
                    to="/sign-in"
                    className="text-sm underline underline-offset-4"
                >
                    Back to sign in
                </Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">Email verified</h1>
            <p className="text-sm text-balance text-muted-foreground">
                Taking you to your dashboard...
            </p>
        </div>
    )
}
```

Success (`emailVerified: true`, session cookie already set by `autoSignInAfterVerification`) auto-redirects to `/` after 1.5s. Once Task 6 adds the `_auth` reverse-guard, an authenticated hit on this route will actually redirect even faster, before this component's own timeout fires — that's fine, both paths land in the same place. The failure branch (`?error=...`) has no session, so Task 6's guard won't intercept it, and this page's error message renders normally.

### Step 2: Manual verification

Run `bun run dev` and visit `/verify-email?error=INVALID_TOKEN` directly — confirm the "Verification failed" state renders. (The success path is exercised end-to-end by Task 1's worker test and by manually completing Task 3's sign-up flow once a real token is available.)

### Step 3: Typecheck and commit

Run: `bun run build`

```bash
git add app/routes/_auth/verify-email.tsx
git commit -m "feat(app): add the verify-email landing page"
```

---

## Task 6: Frontend — redirect authenticated users away from `_auth`

**Files:**
- Modify: `app/routes/_auth/route.tsx`

**Interfaces:**
- Mirrors `app/routes/_dashboard/route.tsx`'s existing `beforeLoad` guard (inverted), using the same `authClient` import from `@/lib/auth`.

### Step 1: Add the reverse guard

Replace the full contents of `app/routes/_auth/route.tsx`:

```tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { authClient } from '@/lib/auth'

export const Route = createFileRoute('/_auth')({
    component: RouteComponent,
    beforeLoad: async () => {
        const session = await authClient.getSession()

        if (session.data) {
            throw redirect({ to: '/' })
        }
    }
})

function RouteComponent() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                    <a
                        href="#"
                        className="flex items-center gap-2 font-medium"
                    >
                        Xpens
                    </a>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-sm">
                        <Outlet />
                    </div>
                </div>
            </div>
            <div className="relative hidden bg-muted lg:block">
                <img
                    src="https://placehold.net/default.svg"
                    alt="Image"
                    className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                />
            </div>
        </div>
    )
}
```

### Step 2: Manual verification — the full end-to-end flow

Run `bun run dev`, then in a browser (this is the complete happy-path walkthrough, now that every piece is wired):

1. Sign up at `/sign-up` with a fresh email/password. Confirm "Check your email".
2. Confirm visiting `/sign-in` or `/sign-up` while **not** signed in still works normally (no session yet, since verification hasn't happened — sign-up doesn't create a session under `requireEmailVerification`).
3. Using the worker test suite's technique isn't available in a browser; instead, temporarily hit the API directly to verify (or rely on Task 1's automated coverage) — either way, confirm the already-implemented pieces compose: after a session exists (e.g. sign in with Google, or complete verification via the worker test path), visiting `/sign-in` or `/sign-up` redirects to `/`.
4. Sign out. Confirm `/` now redirects to `/sign-in` (existing `_dashboard` guard), and `/sign-in` no longer redirects (no session).
5. From a protected page, note the browser lands on `/sign-in?redirect=...`; after signing in, confirm it returns to that original page rather than always landing on `/`.

### Step 3: Typecheck, full test suite, and commit

Run: `bun run test`, `bun run build`, `bun run lint`.

```bash
git add app/routes/_auth/route.tsx
git commit -m "feat(app): redirect authenticated users away from sign-in/sign-up"
```

---

## Self-Review Notes

- **Spec coverage:** Goal 1 (email/password alongside Google) — Task 1. Goal 2 (required verification) — Task 1 (`requireEmailVerification`). Goal 3 (password reset) — Task 1 (`sendResetPassword` config, built-in endpoints) + Task 4 (UI). Goal 4 (shell-user linking) — Task 1's hook. Goal 5 (`_auth` reverse guard) — Task 6. Goal 6 (redirect param consumed) — Task 2 (`validateSearch` + `navigate({ href: redirect })`).
- **Placeholder scan:** none — every step has runnable code or a concrete manual-test script.
- **Type consistency:** `sendVerificationEmail`/`sendPasswordResetEmail` signatures (`{ to, url }`) match between `worker/lib/email.ts` (Task 1) and their call sites in `worker/lib/auth.ts` (Task 1). `authClient` re-exports (`sendVerificationEmail`, `requestPasswordReset`, `resetPassword`) added in Task 2 are consumed with matching names in Tasks 2 and 4. The `/verify-email` callback URL used in Task 1's hook, Task 3's `signUp.email` call, and Task 2's `sendVerificationEmail` resend call are all the same literal path, matching what Task 5's page is built to receive.
