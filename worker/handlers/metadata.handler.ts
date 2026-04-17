import { createFactory } from "hono/factory"
import { HTTPException } from "hono/http-exception"

import * as HTTPStatus from "@workers/status-codes"
import * as HTTPPhrases from "@workers/status-phrases"

import type { AppBindings } from "@workers/types"
import { zValidator } from "@hono/zod-validator"
import { insertMetadataSchema } from "@workers/database/schemas"
import { setCookie } from "hono/cookie"

const factory = createFactory<AppBindings>()

const validateMetadataBody = zValidator(
  "json",
  insertMetadataSchema,
  result => {
    if (!result.success) {
      throw new HTTPException(HTTPStatus.BAD_REQUEST, {
        message: HTTPPhrases.BAD_REQUEST
      })
    }
  }
)

const DEFAULT_LEDGER_COOKIE = "default_ledger"

export const upsertDefault = factory.createHandlers(
  validateMetadataBody,
  async ctx => {
    const container = ctx.get("container")
    const metadataService = container.resolve("metadataService")

    const body = ctx.req.valid("json")

    const result = await metadataService.upsertDefaults({ ...body })

    if (result.defaults?.ledgerId) {
      setCookie(ctx, DEFAULT_LEDGER_COOKIE, result.defaults.ledgerId)
    }

    return ctx.json({ msg: "successfully updated" })
  }
)
