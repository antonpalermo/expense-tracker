import { createContainer, asClass } from "awilix"

import { UserService } from "@workers/services/user.service"
import { LedgerService } from "@workers/services/ledger.service"
import { MetadataService } from "@workers/services/metadata.service"

export type Cradle = {
  userService: UserService
  ledgerService: LedgerService
  metadataService: MetadataService
}

const container = createContainer<Cradle>({ strict: true })

container.register({
  userService: asClass(UserService).singleton(),
  ledgerService: asClass(LedgerService).singleton(),
  metadataService: asClass(MetadataService).singleton()
})

export default container
