import {
  DialogClose,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogContent,
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

import TransactionForm from "@/components/transaction-form"

export default function TransactionDialog() {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New transaction</DialogTitle>
        <DialogDescription>
          Creates new transaction entry in the ledger
        </DialogDescription>
      </DialogHeader>
      <TransactionForm />
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost">Cancel</Button>
        </DialogClose>
        <Button type="submit" form="transaction-form">
          Submit
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
