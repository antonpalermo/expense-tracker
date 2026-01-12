import { createMiddleware } from "hono/factory"
import type { AppBindings } from "@workers/lib/types"

import { createAuth } from "@workers/lib/configure-better-auth"

export const session = createMiddleware<AppBindings>(async (ctx, next) => {
  const session = await createAuth(ctx.env).api.getSession({
    headers: ctx.req.raw.headers
  })

  if (!session) {
    ctx.set("user", null)
    await next()
    return
  }

  ctx.set("user", session.user)
  await next()
})
