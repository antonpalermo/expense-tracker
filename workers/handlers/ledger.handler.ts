import z from "zod"
import { createFactory } from "hono/factory"
import { zValidator } from "@hono/zod-validator"

import type { AppBindings } from "@/lib/types"

import { LedgerService } from "@/services/ledger.service"
import { insertLedgerSchema, insertTransactionSchema } from "@/database/schema"

import * as HTTPStatus from "@/status-codes"

const factory = createFactory<AppBindings>()

/**
 * create ledger handler.
 */
export const createLedger = factory.createHandlers(
  zValidator("json", insertLedgerSchema),
  async ctx => {
    const user = ctx.get("user")
    const payload = ctx.req.valid("json")

    const data = await LedgerService.createLedger({
      ...payload,
      userId: user.id
    })

    return ctx.json(data, HTTPStatus.CREATED)
  }
)

/**
 * gets all ledger created by current user.
 */
export const getUserLedgers = factory.createHandlers(async ctx => {
  const user = ctx.get("user")

  try {
    const ledgers = await LedgerService.getUserLedgers(user.id)
    return ctx.json(ledgers, HTTPStatus.OK)
  } catch (error) {
    console.log(error)
  }
})

/**
 * create ledger transaction entry handler.
 */
export const createTransaction = factory.createHandlers(
  zValidator("param", z.object({ id: z.string() })),
  // we remove the userId from validation since we're getting
  // the user id in the context.
  zValidator("json", insertTransactionSchema.omit({ userId: true })),
  async ctx => {
    const user = ctx.get("user")

    const param = ctx.req.valid("param")
    const payload = ctx.req.valid("json")

    const data = await LedgerService.createTransaction({
      ...payload,
      userId: user.id,
      ledgerId: param.id
    })

    return ctx.json(data, HTTPStatus.CREATED)
  }
)
