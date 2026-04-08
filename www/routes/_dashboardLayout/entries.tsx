import { createEntryDialogHandle } from "@client/components/dialog-registry"
import EntryDialog from "@client/components/entry-dialog"
import { Button } from "@client/components/ui/button"
import { DialogTrigger } from "@client/components/ui/dialog"
import useLedgers from "@client/hooks/use-ledgers"
import { IconPlus } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_dashboardLayout/entries")({
  component: RouteComponent
})

function RouteComponent() {
  const { data: ledgers } = useLedgers()
  const { data, isPending, isError } = useQuery({
    queryKey: ["entries", ledgers?.default],
    enabled: !!ledgers?.default,
    queryFn: async () => {
      const request = await fetch(`/api/ledgers/${ledgers?.default}`)
      if (!request.ok) {
        return null
      }
      return await request.json()
    }
  })

  if (isPending) {
    return null
  }

  if (isError) {
    return null
  }

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
      {JSON.stringify(data)}
    </div>
  )
}
