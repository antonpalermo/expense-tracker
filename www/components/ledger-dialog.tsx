import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogDescription,
  DialogFooter
} from "@client/components/ui/dialog"
import { Button } from "@client/components/ui/button"
import { createLedgerDialogHandle } from "@client/components/dialog-registry"

import LedgerForm from "@client/components/ledger-form"

export default function LedgerDialog() {
  return (
    <Dialog handle={createLedgerDialogHandle}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new ledger</DialogTitle>
          <DialogDescription>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          </DialogDescription>
        </DialogHeader>
        <LedgerForm />
        <DialogFooter>
          <Button variant="ghost">Cancel</Button>
          <Button type="submit" form="ledger-form">
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
