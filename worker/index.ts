import { Hono } from "hono"

import formRoutes from "@/routes/form"
import taskRoutes from "@/routes/entries"

export type HonoBindings = {
    Bindings: CloudflareBindings
}

const app = new Hono<HonoBindings>({ strict: false }).basePath("/api")
const routes = [formRoutes, taskRoutes]

routes.forEach(route => app.route("/", route))

export default app
