import { ledger } from "../database/schema"
import { createRoute } from "../lib/create-route"

const routes = createRoute().basePath("/ledgers")

routes.post("/create", async ctx => {
  const db = ctx.get("db")
  const user = ctx.get("user")

  const createdLedger = await db
    .insert(ledger)
    .values({ name: "Sample", userId: user.id })
    .returning()

  return ctx.json({ createdLedger })
})

export default routes
