import { Hono } from "hono"

import formRoutes from "@/routes/form"

const app = new Hono({ strict: false }).basePath("/api")
const routes = [formRoutes]

routes.forEach(route => app.route("/", route))

export default app
