import { Hono } from "hono"

const app = new Hono({ strict: false }).basePath("/api")

app.get("/status", ctx => {
  return ctx.json({ status: "healthy" })
})

export default app
