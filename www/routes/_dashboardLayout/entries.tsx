import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_dashboardLayout/entries")({
  component: RouteComponent
})

function RouteComponent() {
  return <div>Hello "/_dashboardLayout/entries"!</div>
}
