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
  data: {
    default: string
    ledgers: z.infer<typeof selectLedgerSchema>[]
  }
}

export default function LedgerSelector({ data }: LedgerSelectorProps) {
  const defaultSelected = data.ledgers.find(
    ledger => ledger.id === data.default
  )

  const availableLedgers = data.ledgers.map(ledger => (
    <DropdownMenuItem key={ledger.id}>{ledger.name}</DropdownMenuItem>
  ))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline">{defaultSelected?.name}</Button>
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
