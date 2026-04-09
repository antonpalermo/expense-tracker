import z from "zod"
import { createFactory } from "hono/factory"
import { HTTPException } from "hono/http-exception"
import { setCookie } from "hono/cookie"
import { zValidator } from "@hono/zod-validator"

import * as HTTPStatus from "@workers/status-codes"

import type { AppBindings } from "@workers/types"

const factory = createFactory<AppBindings>()

// ledger cuid validation schema
const param = z.object({
  id: z.cuid2()
})

export const getLedgers = factory.createHandlers(async ctx => {
  const user = ctx.get("user")
  const container = ctx.get("container")
  const ledgerService = container.resolve("ledgerService")

  const ledgers = await ledgerService.ownedLedgers(user.id)

  if (!ledgers) {
    // used unauthorized here since if the user is not
    // authenticated there will be no result.
    throw new HTTPException(HTTPStatus.UNAUTHORIZED)
  }

  if (ledgers.default) {
    setCookie(ctx, "default_ledger", ledgers.default.id)
  }

  return ctx.json(ledgers, HTTPStatus.OK)
})

export const getLedger = factory.createHandlers(
  zValidator("param", param),
  async ctx => {
    const param = ctx.req.valid("param")
    const container = ctx.get("container")
    const ledgerService = container.resolve("ledgerService")

    const ledgerDetails = await ledgerService.getLedger(param.id)

    if (!ledgerDetails) {
      throw new HTTPException(HTTPStatus.NOT_FOUND)
    }

    return ctx.json(ledgerDetails, HTTPStatus.OK)
  }
)
