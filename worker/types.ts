import type z from "zod"
import type { AwilixContainer } from "awilix"

import type { Cradle } from "@workers/container"
import type { selectLedgerSchema } from "@workers/database/schemas"
import auth from "@workers/lib/auth"

export type Session = typeof auth.$Infer.Session

export type AppBindings = {
  Bindings: CloudflareBindings
  Variables: {
    user: Session["user"]
    session: Session["session"]
    container: AwilixContainer<Cradle>
    ledger: z.infer<typeof selectLedgerSchema>
  }
}
