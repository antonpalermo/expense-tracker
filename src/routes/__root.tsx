import * as React from "react"

import { TanStackDevtools } from "@tanstack/react-devtools"
import { FormDevtoolsPanel } from "@tanstack/react-form-devtools"
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"

import { Outlet, createRootRouteWithContext } from "@tanstack/react-router"

export type RouterContext = {
  isAuthenticated: boolean
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent
})

function RootComponent() {
  return (
    <React.Fragment>
      <Outlet />
      <TanStackDevtools
        plugins={[
          {
            name: "Tanstack Form",
            render: <FormDevtoolsPanel />,
            defaultOpen: false
          },
          {
            name: "Tanstack Router",
            render: <TanStackRouterDevtoolsPanel />,
            defaultOpen: false
          },
          {
            name: "Tanstack Query",
            render: <ReactQueryDevtoolsPanel />,
            defaultOpen: false
          }
        ]}
      />
    </React.Fragment>
  )
}
