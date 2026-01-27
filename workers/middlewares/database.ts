import { createMiddleware } from "hono/factory"

import { Pool } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-serverless"

import type { AppBindings } from "../lib/types"

export const database = createMiddleware<AppBindings>(async (ctx, next) => {
  const client = new Pool({
    connectionString: ctx.env.DATABASE_URL
  })

  const db = drizzle({ client })

  ctx.set("db", db)

  return await next()
})
