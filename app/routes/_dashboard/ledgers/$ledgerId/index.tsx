import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { getEntries } from '@/apis/entries'
import { getLedger } from '@/apis/ledgers'
import { DataTable } from '@/components/data-table'
import { entryHandler } from '@/components/dialog-handlers'
import { createColumns } from '@/components/entries/columns'
import EntryFormDialog from '@/components/entries/dialog'
import DialogConfirmation from '@/components/entries/dialog-confirmation'
import RoleGate from '@/components/role-gate'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { entriesKeys, ledgersKeys } from '@/query-keys'

export const Route = createFileRoute('/_dashboard/ledgers/$ledgerId/')({
    component: EntriesPage
})

function EntriesPage() {
    const { ledgerId } = Route.useParams()

    const { data: ledger } = useQuery({
        queryKey: ledgersKeys.detail(ledgerId),
        queryFn: () => getLedger(ledgerId)
    })

    const entries = useQuery({
        queryKey: entriesKeys.byLedger(ledgerId),
        queryFn: () => getEntries(ledgerId)
    })

    const role = ledger?.role

    return (
        <div className="space-y-5">
            <EntryFormDialog />
            <DialogConfirmation />

            <div className="flex items-center justify-between">
                <h2 className="font-bold text-2xl">Expenses</h2>
                <RoleGate role={role} required="member">
                    <Button
                        onClick={() =>
                            entryHandler.openWithPayload({
                                type: 'create',
                                ledgerId
                            })
                        }
                    >
                        <Plus className="size-4" />
                        Create
                    </Button>
                </RoleGate>
            </div>

            {entries.isPending || !role ? (
                <Skeleton className="h-64" />
            ) : entries.isError ? (
                <p className="text-destructive text-sm">
                    {entries.error.message}
                </p>
            ) : (
                <DataTable
                    data={entries.data}
                    columns={createColumns(ledgerId, role)}
                />
            )}
        </div>
    )
}
