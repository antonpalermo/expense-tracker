import * as React from "react"
import {
  MutationCache,
  QueryClient,
  QueryClientProvider
} from "@tanstack/react-query"

import LedgerProvider from "./ledger-provider"

const client = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: (_data, _var, _result, mutation) => {
      client.invalidateQueries({
        queryKey: mutation.options.mutationKey
      })
    }
  })
})

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <LedgerProvider>{children}</LedgerProvider>
    </QueryClientProvider>
  )
}
