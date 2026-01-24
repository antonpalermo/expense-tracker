import { createFileRoute } from "@tanstack/react-router"

import { createAuthClient } from "better-auth/react"

export const Route = createFileRoute("/login")({
  component: RouteComponent
})

const client = createAuthClient()

function RouteComponent() {
  async function signIn() {
    await client.signIn.social({ provider: "google", callbackURL: "/" })
  }

  return (
    <div>
      <h1>Hello from Login</h1>
      <button onClick={signIn}>Sign in with Google</button>
    </div>
  )
}
