import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { getLedger } from '@/apis/ledgers'
import DeleteLedgerDialog from '@/components/ledgers/delete-dialog'
import LeaveLedgerDialog from '@/components/ledgers/leave-dialog'
import LedgerSwitcher from '@/components/ledgers/switcher'
import LedgerActions from '@/components/ledgers/table-actions'
import { Skeleton } from '@/components/ui/skeleton'
import { LAST_LEDGER_KEY } from '@/lib/last-ledger'
import { ledgersKeys } from '@/query-keys'

export const Route = createFileRoute('/_dashboard/ledgers/$ledgerId')({
    component: LedgerLayout
})

function LedgerLayout() {
    const { ledgerId } = Route.useParams()

    const {
        data: ledger,
        isPending,
        isError,
        error
    } = useQuery({
        queryKey: ledgersKeys.detail(ledgerId),
        queryFn: () => getLedger(ledgerId)
    })

    useEffect(() => {
        if (ledger) {
            localStorage.setItem(LAST_LEDGER_KEY, ledger.id)
        }
    }, [ledger])

    if (isPending) {
        return (
            <div className="container mx-auto space-y-4 px-5 py-6">
                <Skeleton className="h-9 w-56" />
                <Skeleton className="h-64" />
            </div>
        )
    }

    if (isError) {
        return (
            <div className="container mx-auto px-5 py-6">
                <p className="text-destructive text-sm">{error.message}</p>
                <Link to="/ledgers" className="text-sm underline">
                    Back to ledgers
                </Link>
            </div>
        )
    }

    return (
        <div className="container mx-auto space-y-6 px-5 py-6">
            <DeleteLedgerDialog />
            <LeaveLedgerDialog />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <LedgerSwitcher
                        activeLedgerId={ledger.id}
                        activeLedgerName={ledger.name}
                    />
                    <LedgerActions ledger={ledger} />
                </div>
                <div className="flex items-center gap-1 text-sm">
                    <Link
                        to="/ledgers/$ledgerId"
                        params={{ ledgerId }}
                        activeOptions={{ exact: true }}
                        activeProps={{ className: 'font-semibold underline' }}
                        className="px-2 py-1"
                    >
                        Entries
                    </Link>
                    <Link
                        to="/ledgers/$ledgerId/members"
                        params={{ ledgerId }}
                        activeProps={{ className: 'font-semibold underline' }}
                        className="px-2 py-1"
                    >
                        Members
                    </Link>
                </div>
            </div>

            <Outlet />
        </div>
    )
}
