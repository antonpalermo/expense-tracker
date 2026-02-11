import LedgerForm from "./ledger-form"
import { Button } from "./ui/button"
import {
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "./ui/dialog"

export default function LedgerDialog() {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New ledger</DialogTitle>
        <DialogDescription>Creates a new blank ledger</DialogDescription>
      </DialogHeader>
      <LedgerForm />
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost">Cancel</Button>
        </DialogClose>
        <Button type="submit" form="ledger-form">
          Create
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
