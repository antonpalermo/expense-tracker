import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  // DropdownMenuShortcut,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"

import type { Ledger } from "@/database/schema"
import { useIsMobile } from "@/hooks/use-mobile"
import { CheckIcon, ChevronsUpDown, Plus } from "lucide-react"
import { Dialog, DialogTrigger } from "./ui/dialog"
import LedgerDialog from "./ledger-dialog"

export default function LedgerSwitcher({
  default: defaultLedgerId,
  ledgers
}: {
  default: string
  ledgers: Ledger[]
}) {
  const isMobile = useIsMobile()

  const defaultLedger = ledgers.find(x => x.id === defaultLedgerId)! // safe to assume that there's always a default ledger

  const ledgerItems = ledgers.map(ledger => (
    <DropdownMenuItem
      key={ledger.id}
      className="gap-2 p-2 flex items-center justify-between"
    >
      {ledger.name}
      {ledger.id === defaultLedger.id && <CheckIcon className="size-4" />}
    </DropdownMenuItem>
  ))

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  {/* <activeTeam.logo className="size-4" /> */}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {defaultLedger.name}
                  </span>
                  {/* <span className="truncate text-xs">{activeTeam.plan}</span> */}
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Ledgers
              </DropdownMenuLabel>
              {ledgerItems}
              <DropdownMenuSeparator />
              <DialogTrigger asChild>
                <DropdownMenuItem className="gap-2 p-2">
                  <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                    <Plus className="size-4" />
                  </div>
                  <div className="text-muted-foreground font-medium">
                    New ledger
                  </div>
                </DropdownMenuItem>
              </DialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
          <LedgerDialog />
        </Dialog>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
