import { env } from 'cloudflare:workers'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/database/db'

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
    }
})
