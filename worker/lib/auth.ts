import { env } from 'cloudflare:workers'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import {
    APIError,
    createAuthMiddleware,
    createEmailVerificationToken
} from 'better-auth/api'
import { db } from '@/database/db'
import * as authSchema from '@/database/schemas/auth'
import { sendPasswordResetEmail, sendVerificationEmail } from '@/lib/email'

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

            if (body.password.length < minPasswordLength) {
                throw APIError.from('BAD_REQUEST', {
                    code: 'INVALID_PASSWORD',
                    message: 'Password is too short'
                })
            }

            if (body.password.length > maxPasswordLength) {
                throw APIError.from('BAD_REQUEST', {
                    code: 'INVALID_PASSWORD',
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
