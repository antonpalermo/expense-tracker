import { Hono } from "hono"

const app = new Hono()

app.get("/msg", ctx => {
  return ctx.json({ msg: "hello from backend" })
})

export default app
