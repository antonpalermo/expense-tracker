import { ledger } from "../database/schema"
import { createRoute } from "../lib/create-route"

const routes = createRoute().basePath("/ledgers")

routes.post("/create", async ctx => {
  const db = ctx.get("db")
  const session = ctx.get("session")

  const user = session?.user

  if (!user) {
    return ctx.json({ message: "Unauthorized" }, 401)
  }

  const createdLedger = await db
    .insert(ledger)
    .values({ id: "ABC", name: "Sample", userId: user.id })
    .returning()

  return ctx.json({ createdLedger })
})

export default routes
