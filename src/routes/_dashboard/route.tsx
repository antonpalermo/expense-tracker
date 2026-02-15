import * as React from "react"

import { createFileRoute, Outlet } from "@tanstack/react-router"
import AppSidebar from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import ContainerHeader from "@/components/container-header"

export const Route = createFileRoute("/_dashboard")({
  component: DashboardRootLayout
})

function DashboardRootLayout() {
  return (
    <React.Fragment>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <ContainerHeader />
        <div className="p-4">
          <Outlet />
        </div>
      </SidebarInset>
    </React.Fragment>
  )
}
