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
}

function shellLinkCacheKey(email: string) {
    return `shell-link:${email}`
}

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
    // row without proving they own that address. Instead, the password is
    // staged in KV (`shell-link:<email>`) and only actually linked once the
    // SAME verification token this request sends is redeemed at
    // `/verify-email` — i.e. only once ownership of the address is proven.
    // Until then, no account row exists and the row still reads as an
    // unclaimed shell, so a genuine attempt from the real owner is unaffected.
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

            await cache.set<PendingShellLink>(
                shellLinkCacheKey(normalizedEmail),
                {
                    userId: existing.user.id,
                    passwordHash: hash,
                    name: body.name
                },
                { expirationTtl: expiresIn }
            )

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

            const pending = await cache.get<PendingShellLink>(
                shellLinkCacheKey(email)
            )
            if (!pending) {
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

            await cache.del(shellLinkCacheKey(email))
        })
    }
})
