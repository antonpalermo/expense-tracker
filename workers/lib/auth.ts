import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { drizzle } from "drizzle-orm/neon-serverless"

import * as schema from "../database/schema"

export const auth = (env: CloudflareBindings): ReturnType<typeof betterAuth> =>
  betterAuth({
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
