import { createFileRoute, useSearch } from "@tanstack/react-router"

import { createAuthClient } from "better-auth/react"

export const Route = createFileRoute("/login")({
  component: RouteComponent,
  validateSearch: s => s as { redirect: string }
})

const client = createAuthClient()

function RouteComponent() {
  const search = useSearch({ from: "/login" })

  console.log(search)

  async function signIn() {
    await client.signIn.social({
      provider: "google",
      callbackURL: search.redirect
    })
  }

  return (
    <div>
      <h1>Hello from Login</h1>
      <button onClick={signIn}>Sign in with Google</button>
    </div>
  )
}
