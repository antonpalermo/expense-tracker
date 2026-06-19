import { z } from "zod"
import type { selectEntriesSchema } from "../worker/database/schemas/entries"

export type Entry = z.infer<typeof selectEntriesSchema>
export type EntryPayload = Omit<
    z.infer<typeof selectEntriesSchema>,
    "id" | "createdAt" | "updatedAt"
>
