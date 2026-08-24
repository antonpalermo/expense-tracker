import { env } from 'cloudflare:workers'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import {
    APIError,
    createAuthMiddleware,
    createEmailVerificationToken
} from 'better-auth/api'
import { jwtVerify } from 'jose'
import { db } from '@/database/db'
import * as authSchema from '@/database/schemas/auth'
import * as cache from '@/lib/cache'
import { sendPasswordResetEmail, sendVerificationEmail } from '@/lib/email'
import nanoid from '@/lib/nanoid'

type PendingShellLink = {
    userId: string
    passwordHash: string
    name: string
    email: string
}

// Keyed by a random per-attempt id (see `hooks.before` below), not by
// email — each sign-up attempt gets its own entry, so concurrent attempts
// for the same address never race/overwrite each other.
function shellLinkCacheKey(linkAttemptId: string) {
    return `shell-link:${linkAttemptId}`
}

// Bound to the same `linkAttemptId` in `hooks.before`/`hooks.after` below.
// httpOnly + short-lived (matches the verification token's expiry); it
// doesn't need HMAC signing, since its own unguessability (like a session
// token) is the security property being relied on, not its integrity.
const SHELL_LINK_ATTEMPT_COOKIE = 'shell-link-attempt'

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
        revokeSessionsOnPasswordReset: true,
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
    // person who tries to register with a password instead of Google.
    //
    // Linking the credential immediately at sign-up time (an earlier version
    // of this hook did that) is a real vulnerability: `/sign-up/email` is
    // unauthenticated, so anyone can plant a password on someone else's shell
    // row without proving they own that address. So the password is staged
    // in KV instead of linked immediately — but staging it keyed only by
    // email (a second earlier version of this hook did that) is *also* a
    // vulnerability: `/verify-email`'s token is single-purpose (it only
    // proves the visitor controls the inbox), and a genuine, unmodified
    // verification email is sent to that inbox as an unavoidable side effect
    // of this very request. An attacker who stages a credential against a
    // victim's shell row relies on nothing more than the victim clicking
    // their own legitimate-looking "finish setting up your account" email —
    // no spoofing required — to get the attacker's password linked to the
    // victim's account.
    //
    // So the staged entry is also bound to the specific browser that made
    // this request: a random `linkAttemptId` (`hooks.before` below) keys the
    // KV entry AND is set as an httpOnly cookie on this response. Because
    // cookies aren't included in the emailed link and don't travel with it,
    // `/verify-email` (`hooks.after` below) only links the credential if
    // that SAME cookie comes back on the request that redeems the token —
    // i.e. only if the browser completing verification is the one that
    // received this response. Trade-off: a legitimate user who signs up on
    // one device and clicks the verification link on a different one ends
    // up verified but NOT linked (no credential) — this is the fix, not a
    // bug; a "claim an already-verified shell account" recovery flow is a
    // separate, later feature.
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
            const existing = await ctx.context.internalAdapter.findUserByEmail(
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

            // Same code/message as the built-in handler's own check
            // (BASE_ERROR_CODES.PASSWORD_TOO_SHORT / PASSWORD_TOO_LONG) —
            // using a distinct code here would let an unauthenticated caller
            // distinguish "this email is an unclaimed shell" from "this
            // email doesn't exist" by submitting a too-short password and
            // reading the error code back, defeating the anti-enumeration
            // properties the rest of this flow relies on.
            if (body.password.length < minPasswordLength) {
                throw APIError.from('BAD_REQUEST', {
                    code: 'PASSWORD_TOO_SHORT',
                    message: 'Password too short'
                })
            }

            if (body.password.length > maxPasswordLength) {
                throw APIError.from('BAD_REQUEST', {
                    code: 'PASSWORD_TOO_LONG',
                    message: 'Password too long'
                })
            }

            const expiresIn =
                ctx.context.options.emailVerification?.expiresIn ?? 3600
            const hash = await ctx.context.password.hash(body.password)

            const linkAttemptId = nanoid()

            await cache.set<PendingShellLink>(
                shellLinkCacheKey(linkAttemptId),
                {
                    userId: existing.user.id,
                    passwordHash: hash,
                    name: body.name,
                    email: normalizedEmail
                },
                { expirationTtl: expiresIn }
            )

            // Only this response's recipient can complete the link — see the
            // comment above the `hooks` block for why this cookie exists.
            ctx.setCookie(SHELL_LINK_ATTEMPT_COOKIE, linkAttemptId, {
                httpOnly: true,
                sameSite: 'lax',
                secure: ctx.context.baseURL.startsWith('https://'),
                path: '/api/auth',
                maxAge: expiresIn
            })

            const token = await createEmailVerificationToken(
                ctx.context.secret,
                normalizedEmail,
                undefined,
                expiresIn
            )
            const url = `${ctx.context.baseURL}/verify-email?token=${token}&callbackURL=${encodeURIComponent('/verify-email')}`

            await ctx.context.options.emailVerification?.sendVerificationEmail?.(
                {
                    user: { ...existing.user, name: body.name },
                    url,
                    token
                },
                ctx.request
            )

            // Synthetic response, matching the shape (not the identity) of
            // the real row: no real id/timestamps leak, matching
            // better-auth's own anti-enumeration duplicate-email response.
            return ctx.json({
                token: null,
                user: {
                    id: nanoid(),
                    name: body.name,
                    email: normalizedEmail,
                    emailVerified: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            })
        }),
        after: createAuthMiddleware(async ctx => {
            if (ctx.path !== '/verify-email') {
                return
            }

            const token = (ctx.query as { token?: string } | undefined)?.token
            if (typeof token !== 'string') {
                return
            }

            let email: string
            try {
                const { payload } = await jwtVerify(
                    token,
                    new TextEncoder().encode(ctx.context.secret),
                    { algorithms: ['HS256'] }
                )
                if (typeof payload.email !== 'string') {
                    return
                }
                email = payload.email.toLowerCase()
            } catch {
                // Invalid/expired token — better-auth's own handler already
                // redirected with an error; nothing to link.
                return
            }

            // Only present if THIS browser is the one that staged a
            // shell-link credential via `/sign-up/email` (see the cookie set
            // there). A verification click from a different browser/device —
            // including the real victim redeeming a token an attacker
            // minted for them — has no cookie here, so nothing gets linked;
            // the row still ends up `emailVerified` via better-auth's own
            // handler, just without a credential attached.
            const linkAttemptId = ctx.getCookie(SHELL_LINK_ATTEMPT_COOKIE)
            if (!linkAttemptId) {
                return
            }

            const pending = await cache.get<PendingShellLink>(
                shellLinkCacheKey(linkAttemptId)
            )

            // One-shot: this cookie/KV pair must never be usable for a
            // second verification request, whatever the outcome below.
            ctx.setCookie(SHELL_LINK_ATTEMPT_COOKIE, '', {
                path: '/api/auth',
                maxAge: 0
            })
            if (pending) {
                await cache.del(shellLinkCacheKey(linkAttemptId))
            }

            // The cookie must also actually belong to the address the token
            // just proved — a stale cookie from a differently-addressed
            // attempt in the same browser must not be usable here.
            if (!pending || pending.email !== email) {
                return
            }

            // Only link once better-auth's own handler has actually flipped
            // emailVerified for this address, and only if the row is still
            // an unclaimed shell (no account may have been linked through a
            // different channel — e.g. Google — in the meantime).
            const current = await ctx.context.internalAdapter.findUserByEmail(
                email,
                { includeAccounts: true }
            )

            if (
                current?.user.id === pending.userId &&
                current.user.emailVerified &&
                current.accounts.length === 0
            ) {
                await ctx.context.internalAdapter.linkAccount({
                    userId: pending.userId,
                    providerId: 'credential',
                    accountId: pending.userId,
                    password: pending.passwordHash
                })
                await ctx.context.internalAdapter.updateUser(pending.userId, {
                    name: pending.name
                })
            }
        })
    }
})
