import type { ErrorHandler } from "hono"
import { HTTPException } from "hono/http-exception"
import type { ContentfulStatusCode } from "hono/utils/http-status"

import * as HTTPStatus from "../status-codes"
import * as HTTPPhrases from "../status-phrases"

export const onError: ErrorHandler = (err, ctx) => {
  if (err instanceof HTTPException) {
    const res = err.getResponse()
    return ctx.json({ message: err.cause }, res.status as ContentfulStatusCode)
  }

  return ctx.json(
    { message: HTTPPhrases.INTERNAL_SERVER_ERROR },
    HTTPStatus.INTERNAL_SERVER_ERROR
  )
}
