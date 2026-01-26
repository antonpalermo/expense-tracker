import { createRoute } from "./lib/create-route"

import authRoutes from "./routes/auth"

import { auth } from "./lib/auth"

const app = createRoute().basePath("/api")

const routes = [authRoutes] as const

app.get("/status", ctx => {
  return ctx.json({ status: "healthy" })
})

export default app
