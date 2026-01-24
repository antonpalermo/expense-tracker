import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"

export const Route = createFileRoute("/")({
  component: HomePage
})

function HomePage() {
  const [status, setStatus] = useState({ status: "" })

  useEffect(() => {
    async function getStatus() {
      const statusRequest = await fetch("/api/status")
      if (!statusRequest.ok) {
        setStatus({ status: "not okay" })
      }

      const serverStatus = (await statusRequest.json()) as { status: string }
      setStatus(serverStatus)
    }

    getStatus()
  }, [])

  return (
    <div className="p-2">
      <h3>Welcome Home!</h3>
      {JSON.stringify(status)}
    </div>
  )
}
