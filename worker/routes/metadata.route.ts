import { Hono } from "hono"
import type { AppBindings } from "@workers/types"

import * as handler from "@workers/handlers/metadata.handler"

const routes = new Hono<AppBindings>({ strict: false }).basePath("/metadata")

routes.patch("/defaults", ...handler.upsertDefault)

export default routes
