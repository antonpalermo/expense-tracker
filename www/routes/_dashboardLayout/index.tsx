import { createFileRoute, redirect } from "@tanstack/react-router"

import App from "@client/components/app"
import { authClient } from "@client/lib/auth-client"

export const Route = createFileRoute("/_dashboardLayout/")({
  component: RouteComponent,
  beforeLoad: async ({ location }) => {
    const { data: session } = await authClient.getSession()

    if (!session) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href
        },
        replace: true
      })
    }
  }
})

function RouteComponent() {
  return <App />
}
