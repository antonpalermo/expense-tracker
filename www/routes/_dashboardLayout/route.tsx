import * as React from "react"
import { createFileRoute, Outlet } from "@tanstack/react-router"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from "@client/components/ui/sidebar"
import AppSidebar from "@client/components/app-sidebar"

export const Route = createFileRoute("/_dashboardLayout")({
  component: RouteComponent
})

function RouteComponent() {
  return (
    <React.Fragment>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
            </div>
          </header>
          <div className="px-4">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </React.Fragment>
  )
}
