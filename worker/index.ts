import { Hono } from "hono"

const app = new Hono({ strict: false }).basePath("/api")

app.get("/health", ctx => {
    return ctx.json({ msg: "expense application" })
})

export default app
