import { db } from "@workers/database/db"
import { entry, insertEntrySchema } from "@workers/database/schemas"
import { eq } from "drizzle-orm"
import type z from "zod"

type Entry = z.infer<typeof insertEntrySchema>

export async function getEntries(userId: string) {
  const entries = await db.select().from(entry).where(eq(entry.userId, userId))
  return entries
}

export async function createEntry(values: Entry) {
  const createdEntry = await db
    .insert(entry)
    .values({ ...values })
    .returning()

  return createdEntry[0]
}
