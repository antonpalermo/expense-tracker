import * as React from "react"
import { IconDashboard, IconReceiptDollar } from "@tabler/icons-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader
} from "./ui/sidebar"
import LedgerSwitcher from "./ledger-switcher"
import NavMain, { type NavItem } from "./nav-main"
import NavUser from "./nav-user"
import { authClient } from "@client/lib/auth-client"
import { Skeleton } from "./ui/skeleton"

export default function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { data, isPending } = authClient.useSession()
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
        <NavMain items={mainNavigation} />
      </SidebarContent>
      <SidebarFooter>
        {isPending ? (
          <Skeleton className="w-56 h-12" />
        ) : (
          <NavUser user={data?.user} />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
