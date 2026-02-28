import { createFileRoute } from "@tanstack/react-router"

import App from "@client/components/app"

export const Route = createFileRoute("/")({
  component: RouteComponent
})

function RouteComponent() {
  return <App />
}
