import { eq } from "drizzle-orm"

import { session } from "../middlewares/session"
import { validate } from "../middlewares/validate"

import { createRoute } from "../lib/create-route"
import { createLedgerSchema, ledger, metadata } from "../database/schema"

import * as HTTPStatus from "../status-codes"
import * as HTTPPhrases from "../status-phrases"

const routes = createRoute().basePath("/ledgers")

routes
  .use(session)
  .get("/", async ctx => {
    const db = ctx.get("db")
    const user = ctx.get("user")

    const ledgers = await db
      .select()
      .from(ledger)
      .where(eq(ledger.userId, user.id))
    const defaults = await db
      .select({ defaults: metadata.defaults })
      .from(metadata)
      .where(eq(metadata.userId, user.id))

    return ctx.json(
      { defaults, data: ledgers, message: HTTPPhrases.OK },
      HTTPStatus.OK
    )
  })
  .post("/", validate("json", createLedgerSchema), async ctx => {
    const db = ctx.get("db")
    const user = ctx.get("user")

    const data = await ctx.req.json()

    const createdLedger = await db.transaction(async tx => {
      const [newLedger] = await tx
        .insert(ledger)
        .values({ name: data.name, userId: user.id })
        .returning()

      if (!newLedger) {
        tx.rollback()
      }

      await tx
        .insert(metadata)
        .values({ defaults: { ledger: newLedger.id }, userId: user.id })
        .onConflictDoUpdate({
          target: metadata.userId,
          set: { defaults: { ledger: newLedger.id } }
        })

      return newLedger
    })

    return ctx.json(
      { data: createdLedger, message: HTTPPhrases.CREATED },
      HTTPStatus.CREATED
    )
  })

export default routes
