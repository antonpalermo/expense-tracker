import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: HomePage
})

function HomePage() {
  const createLedger = async () => {
    const request = await fetch("/api/ledgers/create", {
      method: "POST"
    })

    if (!request.ok) {
      console.log("not okay, unable to create ledger")
    }

    const response = await request.json()
    console.log("result", response)
  }

  return (
    <div className="p-2">
      <h3>Welcome Home!</h3>
      <button onClick={createLedger}>Create</button>
    </div>
  )
}
