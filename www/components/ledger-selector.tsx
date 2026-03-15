import z from "zod"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@client/components/ui/dropdown-menu"
import { Button } from "@client/components/ui/button"

import { selectLedgerSchema } from "@workers/database/schemas"
import { DialogTrigger } from "./ui/dialog"
import { createLedgerDialogHandle } from "./dialog-registry"

export type LedgerSelectorProps = {
  ledgers: z.infer<typeof selectLedgerSchema>[]
}

export default function LedgerSelector({ ledgers }: LedgerSelectorProps) {
  const availableLedgers = ledgers.map(ledger => (
    <DropdownMenuItem key={ledger.id}>{ledger.name}</DropdownMenuItem>
  ))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline">Select Ledger</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Ledgers</DropdownMenuLabel>
          {availableLedgers}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DialogTrigger className="w-full" handle={createLedgerDialogHandle}>
          <DropdownMenuItem>Create</DropdownMenuItem>
        </DialogTrigger>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
