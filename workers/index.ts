import { createRoute } from "./lib/create-route"
import { session } from "./middlewares/session"
import { database } from "./middlewares/database"

import authRoutes from "./routes/auth"
import ledgerRoutes from "./routes/ledger"

const app = createRoute().basePath("/api")

app.use(session).use(database)

const routes = [authRoutes, ledgerRoutes] as const

routes.forEach(route => app.route("/", route))

export default app
