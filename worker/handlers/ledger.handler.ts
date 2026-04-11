import z from "zod"
import { setCookie } from "hono/cookie"
import { createFactory } from "hono/factory"
import { HTTPException } from "hono/http-exception"

import { zValidator } from "@hono/zod-validator"

import * as HTTPStatus from "@workers/status-codes"
import * as HTTPPhrases from "@workers/status-phrases"

import type { AppBindings } from "@workers/types"
import { insertLedgerSchema } from "@workers/database/schemas"

const factory = createFactory<AppBindings>()

const DEFAULT_LEDGER_COOKIE = "default_ledger"

// ledger cuid validation schema
const param = z.object({
  id: z.cuid2()
})

const validateLedgerParam = zValidator("param", param)

const validateLedgerBody = zValidator(
  "json",
  insertLedgerSchema.omit({ userId: true }),
  result => {
    if (!result.success) {
      throw new HTTPException(HTTPStatus.BAD_REQUEST, {
        message: HTTPPhrases.BAD_REQUEST
      })
    }
  }
)

export const setLedger = factory.createHandlers(
  validateLedgerParam,
  async ctx => {
    const container = ctx.get("container")
    const ledgerService = container.resolve("ledgerService")
    const { id } = ctx.req.valid("param")

    const ledger = await ledgerService.setLedger(id)

    console.log(ledger)

    return ctx.json({ message: "updated" })
  }
)

export const createLedger = factory.createHandlers(
  validateLedgerBody,
  async ctx => {
    const user = ctx.get("user")
    const container = ctx.get("container")
    const ledgerService = container.resolve("ledgerService")

    const body = ctx.req.valid("json")

    const ledger = await ledgerService.createLedger({
      name: body.name,
      userId: user.id
    })

    if (ledger) {
      setCookie(ctx, DEFAULT_LEDGER_COOKIE, ledger.id)
    }

    return ctx.json(ledger)
  }
)

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
