import { Hono } from "hono"
import type { AppBindings } from "@workers/types"

import * as handler from "@workers/handlers/entries.handler"
import * as ledgerHandler from "@workers/handlers/ledger.handler"

const routes = new Hono<AppBindings>({ strict: false })

routes
  .use("*", ...ledgerHandler.getLedger)
  .get("/", ctx => {
    const ledger = ctx.get("ledger")
    return ctx.json(ledger)
  })
  .post("/entries", ...handler.createEntry)

export default routes
