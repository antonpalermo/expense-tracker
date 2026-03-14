import { db } from "@workers/database/db"
import { ledger, type LedgerInput } from "@workers/database/schemas/ledger"
import { eq } from "drizzle-orm"

export async function getLedgers(userId: string) {
  try {
    const result = await db
      .select()
      .from(ledger)
      .where(eq(ledger.userId, userId))

    return result
  } catch (error) {
    // TODO: improve logging here.
    console.log(error)
  }
}

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
