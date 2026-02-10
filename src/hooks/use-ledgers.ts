import { LedgerContext } from "@/contexts"
import { useContext } from "react"

export function useLedgers() {
  const context = useContext(LedgerContext)

  if (typeof context === "undefined") {
    throw new Error("useLedgers must be used within a LedgerProvider")
  }

  return context
}
