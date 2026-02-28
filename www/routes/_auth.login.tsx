import { createFileRoute } from "@tanstack/react-router"
import { socialLogin } from "@client/lib/auth-client"

export const Route = createFileRoute("/_auth/login")({
  component: RouteComponent
})

function RouteComponent() {
  return (
    <div>
      <h1>Login</h1>
      <button onClick={async () => await socialLogin({ provider: "google" })}>
        Sign in with Google
      </button>
    </div>
  )
}
