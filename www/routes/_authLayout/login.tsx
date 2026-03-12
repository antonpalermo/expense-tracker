import { createFileRoute } from "@tanstack/react-router"

// import { socialLogin } from "@client/lib/auth-client"

import LoginForm from "@client/components/login-form"

export const Route = createFileRoute("/_authLayout/login")({
  component: RouteComponent
})

function RouteComponent() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Welcome Back!</h1>
        <span className="text-muted-foreground">
          Sign in to your xpens account.
        </span>
      </div>
      <LoginForm />
    </div>
  )
}
