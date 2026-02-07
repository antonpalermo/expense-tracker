import * as React from "react"

// import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router"

import { SidebarProvider } from "@/components/ui/sidebar"

export type RouterContext = {
  isAuthenticated: boolean
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent
})

function RootComponent() {
  return (
    <React.Fragment>
      <SidebarProvider>
        <Outlet />
      </SidebarProvider>
      {/* <TanStackRouterDevtools /> */}
    </React.Fragment>
  )
}
