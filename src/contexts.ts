import type { Ledger } from "@/database/schema"
import * as React from "react"

export type LedgerContextType = {
  default: string
  ledgers: Ledger[]
}

export const LedgerContext = React.createContext<LedgerContextType | undefined>(
  undefined
)
