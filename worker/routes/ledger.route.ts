import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"

import type { AppBindings } from "@workers/types"
import { zValidator } from "@hono/zod-validator"
import { insertLedgerSchema } from "@workers/database/schemas/ledger"
import { createLedger, getLedgers } from "@workers/services/ledger.service"

import * as HTTPStatus from "@workers/status-codes"
import * as HTTPPhrases from "@workers/status-phrases"

const routes = new Hono<AppBindings>({ strict: false }).basePath("/ledgers")

routes
  .get("/", async ctx => {
    const user = ctx.get("user")

    const ledgers = await getLedgers(user.id)

    return ctx.json(ledgers, HTTPStatus.OK)
  })
  .post(
    "/",
    zValidator("json", insertLedgerSchema.omit({ userId: true }), result => {
      if (!result.success) {
        throw new HTTPException(HTTPStatus.BAD_REQUEST, {
          message: HTTPPhrases.BAD_REQUEST
        })
      }
    }),
    async ctx => {
      const user = ctx.get("user")
      const ledgerData = ctx.req.valid("json")

      const ledger = await createLedger({
        name: ledgerData.name,
        userId: user.id
      })

      return ctx.json(ledger, HTTPStatus.CREATED)
    }
  )

export default routes
