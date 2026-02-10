import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_dashboard/")({
  component: HomePage,
  beforeLoad: async ({ context, location }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href
        }
      })
    }
  }
})

function HomePage() {
  return (
    <div className="p-2">
      <h3>Welcome Home!</h3>
    </div>
  )
}
