import { createRoute } from "@/lib/create-route"

import * as handler from "@/handlers/metadata.handler"

const routes = createRoute().basePath("/metadata")

routes.patch("/", ...handler.updateDefaultLedger)

export default routes
