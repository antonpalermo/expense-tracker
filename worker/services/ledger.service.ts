import { db } from "@workers/database/db"
import { ledger, type LedgerInput } from "@workers/database/schemas/ledger"

export async function createLedger(input: LedgerInput) {
  try {
    const result = await db
      .insert(ledger)
      .values({ ...input })
      .returning()

    return result[0]
  } catch (error) {
    // TODO: improve logging here.
    console.log(error)
  }
}
