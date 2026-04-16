import { zValidator } from "@hono/zod-validator"
import { createFactory } from "hono/factory"
import { HTTPException } from "hono/http-exception"

import type { AppBindings } from "@workers/types"
import { insertEntrySchema } from "@workers/database/schemas"

import * as HTTPStatus from "@workers/status-codes"
import * as HTTPPhrases from "@workers/status-phrases"

const factory = createFactory<AppBindings>()

const validateEntryBody = zValidator(
  "json",
  insertEntrySchema.omit({ userId: true }),
  result => {
    if (!result.success) {
      throw new HTTPException(HTTPStatus.BAD_REQUEST, {
        message: HTTPPhrases.BAD_REQUEST
      })
    }
  }
)

export const createEntry = factory.createHandlers(
  validateEntryBody,
  async ctx => {
    const container = ctx.get("container")
    const currentLedger = ctx.get("ledger")
    const ledgerService = container.resolve("ledgerService")

    const body = ctx.req.valid("json")

    const entry = await ledgerService.createEntry({
      ...body,
      ledgerId: currentLedger.id
    })

    return ctx.json(entry)
  }
)
