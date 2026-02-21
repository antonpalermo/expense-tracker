import { createRoute } from "@/lib/create-route"

import * as handler from "@/handlers/ledger.handler"

const routes = createRoute().basePath("/ledgers")

routes
  // get all ledgers created currently authenticated user.
  .get("/", ...handler.getUserLedgers)
  // creates a new ledger.
  .post("/", ...handler.createLedger)
  // creates a new ledger transaction.
  .post("/:id/transactions", ...handler.createTransaction)

export default routes
