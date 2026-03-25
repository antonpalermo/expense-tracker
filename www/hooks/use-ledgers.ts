import { useQuery } from "@tanstack/react-query"
import type { selectLedgerSchema } from "@workers/database/schemas"
import type z from "zod"

async function getLedgers(): Promise<{
  default: string
  ledgers: z.infer<typeof selectLedgerSchema>[]
}> {
  const request = await fetch("/api/ledgers")
  if (!request.ok) {
    throw new Error("unable to fetch ledgers")
  }
  return await request.json()
}

export default function useLedgers() {
  const result = useQuery({
    queryKey: ["ledgers"],
    queryFn: getLedgers,
    staleTime: Infinity
  })

  return result
}
