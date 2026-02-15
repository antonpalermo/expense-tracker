import { createRoute } from "@/lib/create-route"

const routes = createRoute().basePath("/transactions")

routes
  .get("/", async ctx => {
    return ctx.json({ message: "hello from transactions" })
  })
  .post("/", async ctx => {
    return ctx.json({ message: "successful created" })
  })

export default routes
