import {
    keepPreviousData,
    useQuery,
    useQueryClient
} from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { OnChangeFn, SortingState } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useEffect } from 'react'
import { z } from 'zod'
import { getEntries } from '@/apis/entries'
import { getLedger } from '@/apis/ledgers'
import { getMembers } from '@/apis/members'
import { DataTable } from '@/components/data-table'
import { entryHandler } from '@/components/dialog-handlers'
import {
    createColumns,
    SORT_COLUMN_IDS,
    SORT_FIELDS_BY_COLUMN_ID
} from '@/components/entries/columns'
import EntryFormDialog from '@/components/entries/dialog'
import DialogConfirmation from '@/components/entries/dialog-confirmation'
import EntriesFilterBar from '@/components/entries/filter-bar'
import SummarySection from '@/components/entries/summary/summary-section'
import RoleGate from '@/components/role-gate'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { entriesKeys, ledgersKeys } from '@/query-keys'
import type { EntriesQuery } from '@/types'

const PAGE_SIZE = 20

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
    const queryClient = useQueryClient()

    const { data: ledger } = useQuery({
        queryKey: ledgersKeys.detail(ledgerId),
        queryFn: () => getLedger(ledgerId)
    })

    const { data: members } = useQuery({
        queryKey: ledgersKeys.members(ledgerId),
        queryFn: () => getMembers(ledgerId)
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
        queryFn: () => getEntries(ledgerId, query),
        placeholderData: keepPreviousData
    })

    useEffect(() => {
        if (!entries.data || search.page >= entries.data.totalPages) {
            return
        }

        const nextPageQuery: EntriesQuery = { ...query, page: search.page + 1 }
        queryClient.prefetchQuery({
            queryKey: entriesKeys.byLedger(ledgerId, nextPageQuery),
            queryFn: () => getEntries(ledgerId, nextPageQuery)
        })
        // `query` is derived fresh from `search` every render, so it is
        // intentionally excluded — `search.page` (used to build it) is
        // already a dependency, and including the derived object would
        // re-run this effect every render instead of only on real changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entries.data, ledgerId, queryClient, search.page])

    useEffect(() => {
        const totalPages = entries.data?.totalPages

        if (!totalPages || search.page <= totalPages) {
            return
        }

        navigate({
            search: prev => ({ ...prev, page: totalPages }),
            replace: true
        })
    }, [entries.data, search.page, navigate])

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

            <SummarySection ledgerId={ledgerId} />

            <EntriesFilterBar
                search={search.q}
                onSearchChange={value =>
                    navigate({
                        search: prev => ({
                            ...prev,
                            q: value || undefined,
                            page: 1
                        })
                    })
                }
                members={members ?? []}
                authorIds={search.authorIds ?? []}
                onAuthorIdsChange={authorIds =>
                    navigate({
                        search: prev => ({
                            ...prev,
                            authorIds: authorIds.length ? authorIds : undefined,
                            page: 1
                        })
                    })
                }
            />

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
                    pagination={{
                        pageIndex: search.page - 1,
                        pageSize: PAGE_SIZE
                    }}
                    pageCount={entries.data.totalPages}
                    onPageChange={pageIndex =>
                        navigate({
                            search: prev => ({ ...prev, page: pageIndex + 1 })
                        })
                    }
                />
            )}
        </div>
    )
}
