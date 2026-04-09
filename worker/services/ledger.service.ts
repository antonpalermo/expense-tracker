import { db } from "@workers/database/db"
import { metadata } from "@workers/database/schemas"
import { eq } from "drizzle-orm"

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
