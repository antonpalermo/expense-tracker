import * as React from "react"
import { IconDashboard, IconReceiptDollar } from "@tabler/icons-react"

import { Sidebar, SidebarContent, SidebarHeader } from "./ui/sidebar"
import LedgerSwitcher from "./ledger-switcher"
import MainNav, { type NavItem } from "./main-nav"

export default function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const mainNavigation: NavItem[] = [
    { label: "Dashboard", url: "/", icon: IconDashboard },
    { label: "Entries", url: "/entries", icon: IconReceiptDollar }
  ]

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <LedgerSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <MainNav items={mainNavigation} />
      </SidebarContent>
    </Sidebar>
  )
}
