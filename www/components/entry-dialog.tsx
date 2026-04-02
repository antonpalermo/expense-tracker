import { createEntryDialogHandle } from "./dialog-registry"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "./ui/dialog"
import { Button } from "./ui/button"
import EntryForm from "./entry-form"

export default function EntryDialog() {
  return (
    <Dialog handle={createEntryDialogHandle}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new entry</DialogTitle>
          <DialogDescription>Creates a new ledger entry</DialogDescription>
        </DialogHeader>
        <EntryForm />
        <DialogFooter>
          <DialogClose render={<Button variant="ghost">Cancel</Button>} />
          <Button type="submit" form="entry-form">
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
