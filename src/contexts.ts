import type { Ledger } from "@/database/schema"
import * as React from "react"

export type LedgerContextType = {
  ledgers: Ledger[]
}

export const LedgerContext = React.createContext<LedgerContextType | undefined>(
  undefined
)
