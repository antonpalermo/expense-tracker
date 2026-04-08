import z from "zod"
import { createFactory } from "hono/factory"
import { HTTPException } from "hono/http-exception"

import * as HTTPStatus from "@workers/status-codes"

import type { AppBindings } from "@workers/types"
import { zValidator } from "@hono/zod-validator"

const factory = createFactory<AppBindings>()

// ledger cuid validation schema
const param = z.object({
  id: z.cuid2()
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

    return ctx.json(ledgerDetails)
  }
)
