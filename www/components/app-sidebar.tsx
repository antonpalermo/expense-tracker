import * as React from "react"
import { Sidebar, SidebarHeader } from "./ui/sidebar"
import LedgerSelector from "./ledger-selector"

export default function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <LedgerSelector />
      </SidebarHeader>
    </Sidebar>
  )
}
