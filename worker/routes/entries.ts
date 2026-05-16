import { Hono } from "hono"
import type { Bindings } from "../bindings"

const routes = new Hono<Bindings>({ strict: false }).basePath("/entries")

async function createTask(task: unknown) {
    return task
}

routes.on(["POST"], "/", async ctx => {
    const method = ctx.req.method

    switch (method) {
        case "POST": {
            const body = await ctx.req.json()

            const task = await createTask(body)
            return ctx.json(task)
        }
    }
})

export default routes
