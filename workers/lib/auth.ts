import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

import { env } from "cloudflare:workers"

import * as schema from "../database/schema"
import { db } from "@/database/db"

export const auth = betterAuth({
  appName: "Expense Tracker",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    transaction: true
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
