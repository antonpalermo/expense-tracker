import { Hono } from "hono"

import type { AppBindings } from "@workers/types"
import auth from "@workers/lib/auth"

const routes = new Hono<AppBindings>().basePath("/auth")

routes.on(["GET", "POST"], "*", async ctx => {
  return auth.handler(ctx.req.raw)
})

export default routes
