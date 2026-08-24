import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { OnChangeFn, SortingState } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { z } from 'zod'
import { getEntries } from '@/apis/entries'
import { getLedger } from '@/apis/ledgers'
import { DataTable } from '@/components/data-table'
import { entryHandler } from '@/components/dialog-handlers'
import {
    createColumns,
    SORT_COLUMN_IDS,
    SORT_FIELDS_BY_COLUMN_ID
} from '@/components/entries/columns'
import EntryFormDialog from '@/components/entries/dialog'
import DialogConfirmation from '@/components/entries/dialog-confirmation'
import RoleGate from '@/components/role-gate'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { entriesKeys, ledgersKeys } from '@/query-keys'
import type { EntriesQuery } from '@/types'

export const Route = createFileRoute('/_dashboard/ledgers/$ledgerId/')({
    validateSearch: z.object({
        q: z.string().optional(),
        sort: z.enum(['date', 'amount', 'name']).optional().default('date'),
        order: z.enum(['asc', 'desc']).optional().default('desc'),
        authorIds: z.array(z.string()).optional(),
        page: z.number().int().positive().optional().default(1)
    }),
    component: EntriesPage
})

function EntriesPage() {
    const { ledgerId } = Route.useParams()
    const search = Route.useSearch()
    const navigate = useNavigate({ from: Route.fullPath })

    const { data: ledger } = useQuery({
        queryKey: ledgersKeys.detail(ledgerId),
        queryFn: () => getLedger(ledgerId)
    })

    const query: EntriesQuery = {
        q: search.q,
        sort: search.sort,
        order: search.order,
        authorIds: search.authorIds,
        page: search.page
    }

    const entries = useQuery({
        queryKey: entriesKeys.byLedger(ledgerId, query),
        queryFn: () => getEntries(ledgerId, query)
    })

    const role = ledger?.role

    const sorting: SortingState = [
        {
            id: SORT_COLUMN_IDS[search.sort],
            desc: search.order === 'desc'
        }
    ]

    const handleSortingChange: OnChangeFn<SortingState> = updater => {
        const next = typeof updater === 'function' ? updater(sorting) : updater
        const first = next[0]

        navigate({
            search: prev => ({
                ...prev,
                sort: first ? SORT_FIELDS_BY_COLUMN_ID[first.id] : 'date',
                order: first ? (first.desc ? 'desc' : 'asc') : 'desc',
                page: 1
            })
        })
    }

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
                    data={entries.data.data}
                    columns={createColumns(ledgerId, role)}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                />
            )}
        </div>
    )
}
