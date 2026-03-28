import {
  IconCheck,
  IconChevronDown,
  IconFilePercent,
  IconPlus,
  IconRadioactive
} from "@tabler/icons-react"
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
import { Skeleton } from "./ui/skeleton"
import useLedgers from "@client/hooks/use-ledgers"
import { useSidebar } from "@client/hooks/use-sidebar"
import { createLedgerDialogHandle } from "./dialog-registry"
import { DialogTrigger } from "./ui/dialog"
import { cn } from "@client/lib/utils"

export default function LedgerSwitcher() {
  const { isMobile } = useSidebar()
  const { data, isPending, isError } = useLedgers()

  if (isPending) {
    return <Skeleton className="w-56 h-12" />
  }

  if (isError) {
    return null
  }

  const currentLedger = data.ledgers.find(ledger => ledger.id === data.default)

  const ledgers = data.ledgers.map(ledger => {
    const isCurrentLedger = currentLedger?.id === ledger.id

    return (
      <DropdownMenuItem key={ledger.id} className="gap-2 p-2 ">
        <div className="flex size-6 items-center justify-center rounded-md border">
          <IconFilePercent className="size-3.5 shrink-0" />
        </div>
        <span
          className={cn(
            "font-medium text-muted-foreground",
            isCurrentLedger && "text-foreground"
          )}
        >
          {ledger.name}
        </span>
        {isCurrentLedger && <IconCheck className="ml-auto" />}
      </DropdownMenuItem>
    )
  })

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="w-full"
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-sm bg-sidebar-primary text-sidebar-primary-foreground">
                  <IconRadioactive className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {currentLedger?.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    Active
                  </span>
                </div>
                <IconChevronDown />
              </SidebarMenuButton>
            }
          />
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
              <DialogTrigger
                className="w-full"
                handle={createLedgerDialogHandle}
              >
                <DropdownMenuItem>
                  <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                    <IconPlus className="size-3.5 shrink-0" />
                  </div>
                  <div className="font-medium text-muted-foreground">
                    Add team
                  </div>
                </DropdownMenuItem>
              </DialogTrigger>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
