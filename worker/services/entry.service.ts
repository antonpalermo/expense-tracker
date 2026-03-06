import { db } from "@workers/database/db"
import { entry, insertEntrySchema } from "@workers/database/schemas"
import type z from "zod"

type Entry = z.infer<typeof insertEntrySchema>

export async function createEntry(values: Entry) {
  const createdEntry = await db
    .insert(entry)
    .values({ ...values })
    .returning()

  return createdEntry[0]
}
