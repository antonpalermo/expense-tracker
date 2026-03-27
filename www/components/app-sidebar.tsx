import * as React from "react"
import { Sidebar, SidebarHeader } from "./ui/sidebar"
import LedgerSwitcher from "./ledger-switcher"

export default function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <LedgerSwitcher />
      </SidebarHeader>
    </Sidebar>
  )
}
