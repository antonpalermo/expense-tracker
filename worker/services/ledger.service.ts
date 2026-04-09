import { db } from "@workers/database/db"
import { metadata } from "@workers/database/schemas"
import { ledger, type LedgerInput } from "@workers/database/schemas/ledger"
import { eq } from "drizzle-orm"

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

export async function updateDefaultLedger(data: {
  ledgerId: string
  userId: string
}) {
  try {
    const result = await db
      .update(metadata)
      .set({ defaults: { ledgerId: data.ledgerId } })
      .where(eq(metadata.userId, data.userId))

    return result
  } catch (error) {
    console.log(error)
  }
}
