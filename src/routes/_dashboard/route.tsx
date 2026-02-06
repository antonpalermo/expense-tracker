import Navbar from "@/components/navbar"
import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_dashboard")({
  component: DashboardRootLayout
})

function DashboardRootLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  )
}
