import { eq } from "drizzle-orm"

import { db } from "@workers/database/db"
import { entry, ledger } from "@workers/database/schemas"

export class LedgerService {
  async getLedger(id: string) {
    return await db
      .select()
      .from(ledger)
      .fullJoin(entry, eq(entry.ledgerId, id))
  }
}
