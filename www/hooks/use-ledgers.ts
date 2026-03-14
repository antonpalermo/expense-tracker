import { useQuery } from "@tanstack/react-query"

async function getLedgers() {
  const request = await fetch("/api/ledgers")
  if (!request.ok) {
    throw new Error("unable to fetch ledgers")
  }
  return await request.json()
}

export default function useLedgers() {
  const { isError, ...rest } = useQuery({
    queryKey: ["ledgers"],
    queryFn: getLedgers,
    staleTime: Infinity
  })

  if (isError) {
    throw new Error("unable to fetch ledgers")
  }

  return rest
}
