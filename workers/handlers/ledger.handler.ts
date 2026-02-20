import z from "zod"
import { createFactory } from "hono/factory"
import { zValidator } from "@hono/zod-validator"

import type { AppBindings } from "@/lib/types"
import { LedgerService } from "@/services/ledger.service"
import { insertTransactionSchema } from "@/database/schema"

import * as HTTPStatus from "../status-codes"

const factory = createFactory<AppBindings>()

/**
 * ledger that handles creation of transaction entry.
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

    const data = await LedgerService.create({
      ...payload,
      userId: user.id,
      ledgerId: param.id
    })

    return ctx.json(data, HTTPStatus.CREATED)
  }
)
