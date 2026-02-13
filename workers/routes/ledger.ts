import { eq } from "drizzle-orm"

import { session } from "../middlewares/session"
import { validate } from "../middlewares/validate"

import { createRoute } from "../lib/create-route"
import {
  createLedgerSchema,
  ledger,
  metadata,
  user as userSchema
} from "../database/schema"

import * as HTTPStatus from "../status-codes"
import * as HTTPPhrases from "../status-phrases"

const routes = createRoute().basePath("/ledgers")

routes
  .use(session)
  .get("/", async ctx => {
    const db = ctx.get("db")
    const user = ctx.get("user")

    const result = await db.query.user.findFirst({
      where: eq(userSchema.id, user.id),
      columns: {},
      with: {
        metadata: {
          columns: { defaults: true }
        },
        ledgers: true
      }
    })

    return ctx.json(
      { ledgers: result?.ledgers, default: result?.metadata?.defaults?.ledger },
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
