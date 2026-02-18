import {
  type LucideIcon,
  LayoutDashboardIcon,
  BanknoteArrowDownIcon
} from "lucide-react"

import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarContent
} from "@/components/ui/sidebar"
import { useLedgers } from "@/hooks/use-ledgers"

import NavMain from "@/components/nav-main"
import LedgerSwitcher from "@/components/ledger-switcher"

export type MainRoute = {
  label: string
  path: string
  icon?: LucideIcon
}

export default function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const ledger = useLedgers()

  const mainRoutes: MainRoute[] = [
    {
      label: "Dashboard",
      path: "/",
      icon: LayoutDashboardIcon
    },
    {
      label: "Transactions",
      path: "/transactions",
      icon: BanknoteArrowDownIcon
    }
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <LedgerSwitcher default={ledger.default} ledgers={ledger.ledgers} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain routes={mainRoutes} />
      </SidebarContent>
      <SidebarFooter>Footer</SidebarFooter>
    </Sidebar>
  )
}
