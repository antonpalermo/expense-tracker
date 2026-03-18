import { env } from "cloudflare:workers"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

import { db } from "@workers/database/db"
import * as schemas from "@workers/database/schemas/auth"

// temporarily comment out this constant before
// generating auth database tables.
const auth = betterAuth({
  appName: "xpens",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schemas
  }),
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    }
  }
})
// comment until here!

// uncomment this constant when generating schema
// const auth = betterAuth({
//   baseURL: "http://localhost:5173",
//   secret: "your secret here!",
//   database: drizzleAdapter(db, { provider: "sqlite" })
// })

export default auth
