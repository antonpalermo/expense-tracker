import { createFileRoute } from "@tanstack/react-router"

import { signIn } from "../../lib/auth"

export const Route = createFileRoute("/(auth)/sign-in")({
  component: RouteComponent
})

function RouteComponent() {
  return (
    <div>
      <h1>Sign In</h1>
      <button onClick={async () => await signIn.social({ provider: "google" })}>
        Sign In with Google
      </button>
    </div>
  )
}
