import type z from "zod"
import { eq } from "drizzle-orm"

import { db } from "@workers/database/db"
import {
  ledger as ledgerSchema,
  user as userSchema,
  selectLedgerSchema,
  insertLedgerSchema
} from "@workers/database/schemas"

export class LedgerService {
  async createLedger(details: z.infer<typeof insertLedgerSchema>) {
    const [ledger] = await db.insert(ledgerSchema).values(details).returning()
    return ledger
  }

  async getLedger(id: string) {
    return await db.query.ledger.findFirst({
      where: eq(ledgerSchema.id, id),
      with: { entries: true } // <- only return entries for the past 30 days.
    })
  }

  async ownedLedgers(userId: string): Promise<
    | {
        default: z.infer<typeof selectLedgerSchema> | undefined
        ledgers: z.infer<typeof selectLedgerSchema>[]
      }
    | undefined
  > {
    const userLedgers = await db.query.user.findFirst({
      columns: {},
      where: eq(userSchema.id, userId),
      with: { ledgers: true, metadata: { columns: { defaults: true } } }
    })

    if (!userLedgers) {
      return undefined
    }

    const ledger = userLedgers.ledgers.find(
      ledger => ledger.id === userLedgers.metadata?.defaults?.ledgerId
    )

    return {
      default: ledger,
      ledgers: userLedgers.ledgers
    }
  }
}
