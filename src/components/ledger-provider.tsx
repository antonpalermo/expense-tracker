import * as React from "react"

import { LedgerContext } from "@/contexts"
import { useQuery } from "@tanstack/react-query"
import type { Ledger } from "@/database/schema"

type LedgerResponse = {
  default: string
  ledgers: Ledger[]
}

export default function LedgerProvider({
  children
}: {
  children: React.ReactNode
}) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["ledgers"],
    queryFn: getLedgers,
    staleTime: Infinity
  })

  async function getLedgers(): Promise<LedgerResponse> {
    const request = await fetch("/api/ledgers")

    if (!request.ok) {
      throw new Error("unable to fetch all ledgers")
    }

    return await request.json()
  }

  if (isPending) {
    return <div>Loading...</div>
  }

  if (isError) {
    return <div>Error: {error.message}</div>
  }

  return (
    <LedgerContext value={{ default: data.default, ledgers: data.ledgers }}>
      {children}
    </LedgerContext>
  )
}
