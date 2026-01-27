import { createRoute } from "./lib/create-route"
import { session } from "./middlewares/session"
import { database } from "./middlewares/database"

import authRoutes from "./routes/auth"

const app = createRoute().basePath("/api")

app.use(session).use(database)

const routes = [authRoutes] as const

routes.forEach(route => app.route("/", route))

export default app
