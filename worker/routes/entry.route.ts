import { Hono } from "hono"

import type { AppBindings } from "@workers/types"
import * as handlers from "@workers/handlers/entry.handler"

const routes = new Hono<AppBindings>({ strict: false }).basePath("/entries")

routes.get("/", ...handlers.getEntries).post("/", ...handlers.createEntry)

export default routes
