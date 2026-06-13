import { z } from "zod"
import type { selectEntriesSchema } from "../worker/database/schemas/entries"

export type SelectEntry = z.infer<typeof selectEntriesSchema>
export type InsertEntry = Omit<
    z.infer<typeof selectEntriesSchema>,
    "id" | "createdAt" | "updatedAt"
>
