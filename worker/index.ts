import { Hono } from "hono"

import formRoutes from "@/routes/form"
import taskRoutes from "@/routes/entries"

const app = new Hono({ strict: false }).basePath("/api")
const routes = [formRoutes, taskRoutes]

routes.forEach(route => app.route("/", route))

export default app
