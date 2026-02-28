import { Hono } from "hono"
import { logger } from "hono/logger"
import { secureHeaders } from "hono/secure-headers"

import authRoutes from "@workers/routes/auth.route"

const app = new Hono({ strict: false }).basePath("/api")

app.use(logger())
app.use(secureHeaders())

const routes = [authRoutes]

routes.forEach(route => app.route("/", route))

export default app
