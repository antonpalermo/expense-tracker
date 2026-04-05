import { createContainer, asClass } from "awilix"
import { LedgerService } from "./services/ledger"

const container = createContainer<{
  ledgerService: LedgerService
}>({ strict: true })

container.register({
  ledgerService: asClass(LedgerService).singleton()
})

export default container
