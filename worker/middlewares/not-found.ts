import type { NotFoundHandler } from "hono"

import * as HTTPStatus from "@workers/status-codes"
import * as HTTPPhrases from "@workers/status-phrases"

const notFound: NotFoundHandler = ctx => {
  return ctx.json(
    { message: `${HTTPPhrases.NOT_FOUND} - ${ctx.req.path}` },
    HTTPStatus.NOT_FOUND
  )
}

export default notFound
