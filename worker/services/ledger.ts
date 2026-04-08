import { eq } from "drizzle-orm"

import { db } from "@workers/database/db"
import { ledger as ledgerSchema } from "@workers/database/schemas"

export class LedgerService {
  async getLedger(id: string) {
    return await db.query.ledger.findFirst({
      where: eq(ledgerSchema.id, id),
      with: { entries: true } // <- only return entries for the past 30 days.
    })
  }
}
