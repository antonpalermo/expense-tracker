import { Hono } from "hono"
import type { Bindings } from "../bindings"

const routes = new Hono<Bindings>({ strict: false }).basePath("/tasks")

async function createTask() {}

routes.on(["POST"], "/", async ctx => {
    const method = ctx.req.method

    switch (method) {
        case "POST": {
            await createTask()
            return ctx.json({ msg: "ok" })
        }
    }
})

export default routes
