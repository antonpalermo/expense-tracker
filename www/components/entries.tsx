import * as React from "react"

export default function Entries() {
  const [entries, setEntries] = React.useState()

  React.useEffect(() => {
    async function getEntries() {
      const request = await fetch("/api/entries", {
        headers: {
          "Content-Type": "application/json"
        }
      })

      if (!request.ok) {
        throw new Error("unable to fetch all entries")
      }

      setEntries(await request.json())
    }

    getEntries()
  }, [])

  return (
    <div>
      <pre>{JSON.stringify(entries, null, 2)}</pre>
    </div>
  )
}
