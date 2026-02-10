import * as React from "react"

import { LedgerContext } from "@/contexts"
import { useQuery } from "@tanstack/react-query"

export default function LedgerProvider({
  children
}: {
  children: React.ReactNode
}) {
  const {
    data: ledgers,
    isPending,
    isError,
    error
  } = useQuery({
    queryKey: ["ledgers"],
    queryFn: getLedgers,
    staleTime: Infinity
  })

  async function getLedgers() {
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
    <LedgerContext value={{ ledgers: ledgers.data }}>{children}</LedgerContext>
  )
}
