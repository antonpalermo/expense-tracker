import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"

import type { AppBindings } from "@workers/types"
import { zValidator } from "@hono/zod-validator"
import { insertLedgerSchema, ledger } from "@workers/database/schemas/ledger"
import { createLedger, getLedgers } from "@workers/services/ledger.service"

import * as HTTPStatus from "@workers/status-codes"
import * as HTTPPhrases from "@workers/status-phrases"
import z from "zod"
import { db } from "@workers/database/db"
import { entry, metadata } from "@workers/database/schemas"
import { eq } from "drizzle-orm"

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
  .patch(
    "/defaults/:id",
    zValidator("param", z.object({ id: z.cuid2() })),
    async ctx => {
      const user = ctx.get("user")
      const { id } = ctx.req.valid("param")

      try {
        const result = await db
          .update(metadata)
          .set({ defaults: { ledgerId: id } })
          .where(eq(metadata.userId, user.id))
        return ctx.json(result)
      } catch (error) {
        console.log(error)
        throw new HTTPException(HTTPStatus.SERVICE_UNAVAILABLE)
      }
    }
  )
  .get("/:id", zValidator("param", z.object({ id: z.cuid2() })), async ctx => {
    const { id } = ctx.req.valid("param")
    try {
      const result = await db.query.ledger.findFirst({
        where: eq(ledger.id, id)
      })

      if (!result) {
        return ctx.notFound()
      }

      return ctx.json(result)
    } catch (error) {
      console.log(error)
      throw new HTTPException(HTTPStatus.SERVICE_UNAVAILABLE)
    }
  })
  .get(
    "/:ledgerId/entries",
    zValidator("param", z.object({ ledgerId: z.cuid2() })),
    async ctx => {
      const { ledgerId } = ctx.req.valid("param")

      const result = await db.query.entry.findMany({
        where: eq(entry.ledgerId, ledgerId),
        with: {
          user: {
            columns: {
              name: true,
              image: true
            }
          }
        }
      })

      return ctx.json(result)
    }
  )
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
