import type { Hono } from "hono"

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

import { drizzle } from "drizzle-orm/neon-serverless"
import * as schema from "../../database/schema"

import type { AppBindings } from "@workers/lib/types"

export function createAuth(
  env: CloudflareBindings
): ReturnType<typeof betterAuth> {
  const db = drizzle(env.DATABASE_URL)

  const appName = "Expense Tracker"

  return betterAuth({
    appName,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      transaction: true,
      schema
    }),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET
      }
    }
  })
}

export function configureBetterAuth(app: Hono<AppBindings>) {
  app.on(["GET", "POST"], "/auth/*", ctx => {
    return createAuth(ctx.env).handler(ctx.req.raw)
  })
}

// needed for schema generation
const auth = betterAuth({
  database: drizzleAdapter(drizzle(process.env.DATABASE_URL!), {
    provider: "pg"
  })
})

export default auth
