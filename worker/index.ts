import { Hono } from "hono"
import { logger } from "hono/logger"
import { secureHeaders } from "hono/secure-headers"
import { db } from "./database/db"
import { transaction } from "./database/schemas/transaction"

const app = new Hono({ strict: false }).basePath("/api")

app.use(logger())
app.use(secureHeaders())

app.get("/status", async ctx => {
  return ctx.json({ msg: "ok" })
})

app.post("/create", async ctx => {
  const result = await db
    .insert(transaction)
    .values({ name: "shambal" })
    .returning()

  return ctx.json({ transaction: result[0] })
})

app.get("/transactions", async ctx => {
  const result = await db.select().from(transaction)
  return ctx.json(result)
})

export default app
