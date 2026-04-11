import { Hono } from "hono"
import { logger } from "hono/logger"
import { secureHeaders } from "hono/secure-headers"

import authRoutes from "@workers/routes/auth.route"
import ledgersRoutes from "@workers/routes/ledger.route"

import authGuard from "@workers/middlewares/auth-guard"
import dependecyInjection from "@workers/middlewares/dependency-injection"
import notFound from "./middlewares/not-found"

const app = new Hono({ strict: false }).basePath("/api")

app.use(logger())
app.use(secureHeaders())

app.use(authGuard).use(dependecyInjection)

app.notFound(notFound)

const routes = [authRoutes, ledgersRoutes]

routes.forEach(route => app.route("/", route))

export default app
