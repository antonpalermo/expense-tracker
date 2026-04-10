import { createContainer, asClass } from "awilix"
import { LedgerService } from "./services/ledger.service"
import { UserService } from "./services/user.service"

export type Cradle = {
  userService: UserService
  ledgerService: LedgerService
}

const container = createContainer<Cradle>({ strict: true })

container.register({
  userService: asClass(UserService).singleton(),
  ledgerService: asClass(LedgerService).singleton()
})

export default container
