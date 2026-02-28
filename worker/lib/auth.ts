import { env } from "cloudflare:workers"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

import { db } from "@workers/database/db"
import * as schemas from "@workers/database/schemas"

const auth = betterAuth({
  appName: "xpens",
  baseURL: env.BETTER_AUTH_URL, // NOTE: comment out before generating the better-auth schema
  secret: env.BETTER_AUTH_SECRET, // NOTE: comment out before generating the better-auth schema
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: schemas
  })
})

export default auth
