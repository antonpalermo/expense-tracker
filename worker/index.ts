import { Hono } from "hono"

const app = new Hono({ strict: false }).basePath("/api")

const fields: { uid: string; type: string; name: string }[] = [
    {
        uid: "11d8754c-6aeb-4efb-8544-89950320b2f0",
        type: "string",
        name: "Description"
    },
    {
        uid: "6973a073-7d19-4236-a75a-3d1b13b6f1bc",
        type: "number",
        name: "Amount"
    }
]

app.patch("/fields/new", async ctx => {
    const body = await ctx.req.json()
    fields.push(body)
    return ctx.json(fields)
})

app.get("/health", ctx => {
    return ctx.json({ msg: "expense application" })
})

export default app
