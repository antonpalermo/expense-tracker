import { Hono } from "hono"
import { logger } from "hono/logger"
import { secureHeaders } from "hono/secure-headers"

import authRoutes from "@workers/routes/auth.route"
import entriesRroutes from "@workers/routes/entry.route"
import ledgersRoutes from "@workers/routes/ledger.route"

import authGuard from "@workers/middlewares/auth-guard"

const app = new Hono({ strict: false }).basePath("/api")

app.use(logger())
app.use(secureHeaders())

app.use(authGuard)

const routes = [authRoutes, entriesRroutes, ledgersRoutes]

routes.forEach(route => app.route("/", route))

export default app
