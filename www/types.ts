import type z from "zod"
import type { authClient } from "@client/lib/auth-client"
import type { selectLedgerSchema } from "@workers/database/schemas"

export type User = (typeof authClient.$Infer.Session)["user"]
export type Ledger = z.infer<typeof selectLedgerSchema>
