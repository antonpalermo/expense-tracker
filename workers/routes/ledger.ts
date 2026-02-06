import { session } from "../middlewares/session"
import { validate } from "../middlewares/validate"

import { createRoute } from "../lib/create-route"
import { createLedgerSchema, ledger } from "../database/schema"

import * as HTTPStatus from "../status-codes"
import * as HTTPPhrases from "../status-phrases"
import { eq } from "drizzle-orm"

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

    return ctx.json({ data: ledgers, message: HTTPPhrases.OK }, HTTPStatus.OK)
  })
  .post("/", validate("json", createLedgerSchema), async ctx => {
    const db = ctx.get("db")
    const user = ctx.get("user")

    const data = await ctx.req.json()

    const [createdLedger] = await db
      .insert(ledger)
      .values({ name: data.name, userId: user.id })
      .returning({ name: ledger.name })

    return ctx.json(
      { data: createdLedger, message: HTTPPhrases.CREATED },
      HTTPStatus.CREATED
    )
  })

export default routes
