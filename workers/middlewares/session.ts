import { createMiddleware } from "hono/factory"
import type { AppBindings } from "../lib/types"
import { auth } from "../lib/auth"

export const session = createMiddleware<AppBindings>(async (ctx, next) => {
  const session = await auth.api.getSession({ headers: ctx.req.raw.headers })

  if (!session) {
    ctx.set("session", null)
    await next()
    return
  }

  ctx.set("session", session)

  return await next()
})
