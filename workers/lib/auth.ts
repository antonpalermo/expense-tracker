import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { drizzle } from "drizzle-orm/neon-http"

import { env } from "cloudflare:workers"

import * as schema from "../database/schema"

export const auth = betterAuth({
  appName: "Expense Tracker",
  database: drizzleAdapter(drizzle(env.DATABASE_URL), {
    provider: "pg",
    schema
  }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    }
  }
})

export type Session = typeof auth.$Infer.Session
