import { createRoute } from "@/lib/create-route"

import * as handler from "@/handlers/ledger.handler"

const routes = createRoute().basePath("/ledgers")

// creates a new ledger transaction
routes.post("/:id/transactions", ...handler.createTransaction)

export default routes
