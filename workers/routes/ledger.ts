import { validator } from "hono/validator"
import { HTTPException } from "hono/http-exception"

import { createRoute } from "../lib/create-route"
import { createLedgerSchema, ledger } from "../database/schema"

import * as HTTPStatus from "../status-codes"
import * as HTTPPhrases from "../status-phrases"

const routes = createRoute().basePath("/ledgers")

routes.post(
  "/",
  validator("json", value => {
    const parsed = createLedgerSchema.safeParse(value)

    if (!parsed.success) {
      throw new HTTPException(HTTPStatus.UNPROCESSABLE_ENTITY, {
        cause: HTTPPhrases.UNPROCESSABLE_ENTITY
      })
    }

    return parsed.data
  }),
  async ctx => {
    const db = ctx.get("db")
    const user = ctx.get("user")

    const data = await ctx.req.json()

    const [createdLedger] = await db
      .insert(ledger)
      .values({ name: data.name, userId: user.id })
      .returning()

    return ctx.json(createdLedger, HTTPStatus.CREATED)
  }
)

export default routes
