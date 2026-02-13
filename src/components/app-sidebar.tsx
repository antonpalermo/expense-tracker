import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader
} from "@/components/ui/sidebar"
import LedgerSwitcher from "./ledger-switcher"
import { useLedgers } from "@/hooks/use-ledgers"

export default function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const ledger = useLedgers()

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <LedgerSwitcher default={ledger.default} ledgers={ledger.ledgers} />
      </SidebarHeader>
      <SidebarContent>Content</SidebarContent>
      <SidebarFooter>Footer</SidebarFooter>
    </Sidebar>
  )
}
