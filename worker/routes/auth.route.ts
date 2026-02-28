import { Hono } from "hono"

import auth from "@workers/lib/auth"

const routes = new Hono<{ Bindings: CloudflareBindings }>().basePath("/auth")

routes.on(["GET", "POST"], "*", async ctx => {
  return auth.handler(ctx.req.raw)
})

export default routes
