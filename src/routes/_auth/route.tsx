import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_auth")({
  component: AuthRootLayout
})

function AuthRootLayout() {
  return <Outlet />
}
