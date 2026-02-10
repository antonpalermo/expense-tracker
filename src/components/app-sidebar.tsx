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
  const { ledgers } = useLedgers()

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <LedgerSwitcher ledgers={ledgers} />
      </SidebarHeader>
      <SidebarContent>Content</SidebarContent>
      <SidebarFooter>Footer</SidebarFooter>
    </Sidebar>
  )
}
