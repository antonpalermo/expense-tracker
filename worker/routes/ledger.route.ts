import z from "zod"
import { Hono } from "hono"

import type { AppBindings } from "@workers/types"
import { zValidator } from "@hono/zod-validator"

import * as HTTPStatus from "@workers/status-codes"
import * as handler from "@workers/handlers/ledger.handler"

import { db } from "@workers/database/db"
import { entry } from "@workers/database/schemas"

const routes = new Hono<AppBindings>({ strict: false }).basePath("/ledgers")

routes
  .get("/", ...handler.getLedgers)
  .post("/", ...handler.createLedger)
  .get("/:id", ...handler.getLedger)
  .patch("/defaults/:id", ...handler.setLedger)
  .post(
    "/:ledgerId/entries",
    zValidator("param", z.object({ ledgerId: z.cuid2() })),
    zValidator(
      "json",
      z.object({
        amount: z.coerce.number(),
        description: z.string()
      })
    ),
    async ctx => {
      const user = ctx.get("user")
      const body = ctx.req.valid("json")

      const { ledgerId } = ctx.req.valid("param")

      const result = await db.insert(entry).values({
        amount: body.amount,
        description: body.description,
        ledgerId,
        userId: user.id
      })

      return ctx.json(result, HTTPStatus.CREATED)
    }
  )

export default routes
