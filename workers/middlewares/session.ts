import { createMiddleware } from "hono/factory"
import { HTTPException } from "hono/http-exception"

import { auth } from "../lib/auth"
import type { AppBindings } from "../lib/types"

import * as HTTPStatus from "../status-codes"
import * as HTTPPhrases from "../status-phrases"

export const session = createMiddleware<AppBindings>(async (ctx, next) => {
  const session = await auth.api.getSession({ headers: ctx.req.raw.headers })

  if (!session) {
    throw new HTTPException(HTTPStatus.UNAUTHORIZED, {
      cause: HTTPPhrases.UNAUTHORIZED
    })
  }

  ctx.set("session", session.session)
  ctx.set("user", session.user)

  return await next()
})
