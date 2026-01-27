import { createRoute } from "./lib/create-route"
import { database } from "./middlewares/database"

import authRoutes from "./routes/auth"

import { auth } from "./lib/auth"

const app = createRoute().basePath("/api")

app.use(database)

const routes = [authRoutes, ledgerRoutes] as const

app.get("/status", ctx => {
  return ctx.json({ status: "healthy" })
})

export default app
