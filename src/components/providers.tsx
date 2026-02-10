import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import LedgerProvider from "./ledger-provider"

const client = new QueryClient()

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <LedgerProvider>{children}</LedgerProvider>
    </QueryClientProvider>
  )
}
