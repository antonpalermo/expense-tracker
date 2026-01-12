import { createMiddleware } from "hono/factory"
import { drizzle } from "drizzle-orm/neon-serverless"

import type { AppBindings } from "@workers/lib/types"

export const database = createMiddleware<AppBindings>(async (ctx, next) => {
  const db = drizzle(ctx.env.DATABASE_URL)
  ctx.set("db", db)
  await next()
})
