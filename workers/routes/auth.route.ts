import { Hono } from "hono"
import type { AppBindings } from "@/lib/types"

import * as handlers from "@/handlers/auth.handler"

const routes = new Hono<AppBindings>().basePath("/auth")

routes.on(["GET", "POST"], "*", ...handlers.setupAuth)

export default routes
