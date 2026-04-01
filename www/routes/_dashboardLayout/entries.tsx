import { createEntryDialogHandle } from "@client/components/dialog-registry"
import EntryDialog from "@client/components/entry-dialog"
import { Button } from "@client/components/ui/button"
import { DialogTrigger } from "@client/components/ui/dialog"
import { IconPlus } from "@tabler/icons-react"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_dashboardLayout/entries")({
  component: RouteComponent
})

function RouteComponent() {
  return (
    <div>
      <div className="w-full flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Entries</h1>
        <DialogTrigger
          handle={createEntryDialogHandle}
          render={
            <Button>
              <IconPlus />
              Add Entry
            </Button>
          }
        ></DialogTrigger>
      </div>
      <EntryDialog />
    </div>
  )
}
