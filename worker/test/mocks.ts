import { env } from 'cloudflare:test'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { testUtils } from 'better-auth/plugins'
import { drizzle } from 'drizzle-orm/d1'
import * as authSchema from '@/database/schemas/auth'

// `@/lib/auth` cannot be mocked with `vi.mock`: everything reached through
// `@/index` (the Worker under test) loads in its own module cache, isolated
// from the one `vi.mock` registers against — confirmed empirically, since
// `vi.mock('@/lib/auth', ...)` never stops the real `betterAuth()` warning
// from firing even when the mock is declared directly in the test file.
//
// So instead of faking the session lookup, this creates a *real* session:
// a second, test-only better-auth instance sharing the same D1 database and
// secret as the production instance in `@/lib/auth`, plus better-auth's own
// `testUtils` plugin, which writes a genuine `session` row and returns a
// correctly signed cookie. The production `auth.api.getSession()` — running
// for real, inside the Worker under test — validates it exactly as it would
// a real browser session.
const testAuth = betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(drizzle(env.DATABASE, { schema: authSchema }), {
        provider: 'sqlite',
        schema: authSchema
    }),
    plugins: [testUtils()]
})

let currentCookie: string | null = null

/** Signs in as `user` for subsequent `req()` calls; `null` signs out. */
export async function signInAs(user: { id: string } | null) {
    if (!user) {
        currentCookie = null
        return
    }

    const ctx = await testAuth.$context
    const { headers } = await ctx.test.login({ userId: user.id })
    currentCookie = headers.get('cookie')
}

/** Auth headers for the currently signed-in user, merged into `req()`. */
export function authHeaders(): HeadersInit {
    return currentCookie ? { cookie: currentCookie } : {}
}
