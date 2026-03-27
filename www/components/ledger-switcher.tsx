import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@client/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "./ui/dropdown-menu"
import { useSidebar } from "@client/hooks/use-sidebar"
import useLedgers from "@client/hooks/use-ledgers"
import { IconCheck } from "@tabler/icons-react"

export default function LedgerSwitcher() {
  const { isMobile } = useSidebar()
  const { data, isPending, isError } = useLedgers()

  if (isPending) {
    return null
  }

  if (isError) {
    return null
  }

  const currentLedger = data.ledgers.find(ledger => ledger.id === data.default)

  const ledgers = data.ledgers.map(ledger => (
    <DropdownMenuItem
      key={ledger.id}
      className="flex items-center justify-between"
    >
      {ledger.name} {currentLedger?.id === ledger.id && <IconCheck />}
    </DropdownMenuItem>
  ))

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {currentLedger?.name}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Ledgers
              </DropdownMenuLabel>
              {ledgers}
              <DropdownMenuSeparator />
              <DropdownMenuItem>Create new ledger</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
