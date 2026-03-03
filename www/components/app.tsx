import * as React from "react"

export default function App() {
  const [result, setResult] = React.useState()

  React.useEffect(() => {
    async function getEntries() {
      const response = await fetch("/api/entries")
      setResult(await response.json())
    }

    getEntries()
  }, [])

  return (
    <div>
      <span>{JSON.stringify(result, null, 2)}</span>
    </div>
  )
}
