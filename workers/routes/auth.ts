import { auth } from "../lib/auth"
import { createRoute } from "../lib/create-route"

const routes = createRoute()

routes.on(["GET", "POST"], "/auth/*", ctx => {
  return auth.handler(ctx.req.raw)
})

export default routes
