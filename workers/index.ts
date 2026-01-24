import { Hono } from "hono"

import { auth } from "./lib/auth"

const app = new Hono<{ Bindings: CloudflareBindings }>({
  strict: false
}).basePath("/api")

app.on(["GET", "POST"], "/auth/*", ctx => {
  return auth(ctx.env).handler(ctx.req.raw)
})

app.get("/status", ctx => {
  return ctx.json({ status: "healthy" })
})

export default app
