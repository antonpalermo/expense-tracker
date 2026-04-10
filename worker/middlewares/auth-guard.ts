import { createFactory } from "hono/factory"
import { HTTPException } from "hono/http-exception"

import auth from "@workers/lib/auth"
import * as HTTPStatus from "@workers/status-codes"
import * as HTTPPhrases from "@workers/status-phrases"

import type { AppBindings } from "@workers/types"

const factory = createFactory<AppBindings>()

const authGuard = factory.createMiddleware(async (ctx, next) => {
  const container = ctx.get("container")
  const currentRoute = ctx.req.path
  const publicRoutes = ["/api/auth"]

  const isPublicRoute = publicRoutes.some(route =>
    currentRoute.startsWith(route)
  )

  if (isPublicRoute) {
    return await next()
  }

  const currentSession = await auth.api.getSession({
    headers: ctx.req.raw.headers
  })

  if (!currentSession) {
    throw new HTTPException(HTTPStatus.UNAUTHORIZED, {
      message: HTTPPhrases.UNAUTHORIZED
    })
  }

  const userService = container.resolve("userService")

  userService.setUser(currentSession.user)

  ctx.set("user", currentSession.user)
  ctx.set("session", currentSession.session)

  await next()
})

export default authGuard
