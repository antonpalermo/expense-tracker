import { Hono } from "hono"
import { logger } from "hono/logger"
import { secureHeaders } from "hono/secure-headers"

import authRoutes from "@workers/routes/auth.route"
import authGuard from "@workers/middlewares/auth-guard"

const app = new Hono({ strict: false }).basePath("/api")

app.use(logger())
app.use(secureHeaders())

app.use(authGuard)

const routes = [authRoutes]

routes.forEach(route => app.route("/", route))

export default app
