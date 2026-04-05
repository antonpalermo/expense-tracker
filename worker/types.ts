import type { AwilixContainer } from "awilix"
import auth from "@workers/lib/auth"
import type { LedgerService } from "@workers/services/ledger"

export type Session = typeof auth.$Infer.Session

export type AppBindings = {
  Bindings: CloudflareBindings
  Variables: {
    user: Session["user"]
    session: Session["session"]
    container: AwilixContainer<{ ledgerService: LedgerService }>
  }
}
