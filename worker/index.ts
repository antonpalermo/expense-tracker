import { Hono } from "hono"
import { logger } from "hono/logger"
import { secureHeaders } from "hono/secure-headers"

const app = new Hono({ strict: false }).basePath("/api")

app.use(logger())
app.use(secureHeaders())

app.get("/status", async ctx => {
  return ctx.json({ msg: "ok" })
})

export default app
