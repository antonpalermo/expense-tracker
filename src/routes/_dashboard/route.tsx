import * as React from "react"

import { createFileRoute, Outlet } from "@tanstack/react-router"
import AppSidebar from "@/components/app-sidebar"

export const Route = createFileRoute("/_dashboard")({
  component: DashboardRootLayout
})

function DashboardRootLayout() {
  return (
    <React.Fragment>
      <AppSidebar />
      <Outlet />
    </React.Fragment>
  )
}
