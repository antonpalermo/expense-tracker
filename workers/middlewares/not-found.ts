import type { NotFoundHandler } from "hono"

import * as HTTPStatusCodes from "@workers/status-codes"
import * as HTTPStatusPhrases from "@workers/status-phrases"

export const notFound: NotFoundHandler = ctx => {
  return ctx.json(
    {
      message: `${[HTTPStatusPhrases.NOT_FOUND]} - ${ctx.req.path}`
    },
    HTTPStatusCodes.NOT_FOUND
  )
}
