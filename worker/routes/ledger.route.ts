import { Hono } from "hono"

import ledgerEntryRoutes from "@workers/routes/entry.route"
import * as handler from "@workers/handlers/ledger.handler"

import type { AppBindings } from "@workers/types"

const routes = new Hono<AppBindings>({ strict: false }).basePath("/ledgers")

routes
  .get("/", ...handler.getLedgers)
  .post("/", ...handler.createLedger)
  .route("/:id", ledgerEntryRoutes)

export default routes
