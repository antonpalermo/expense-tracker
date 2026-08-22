import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { getMyInvitations } from '@/apis/invitations'
import { getLedgers } from '@/apis/ledgers'
import { ledgerHandler } from '@/components/dialog-handlers'
import PendingInvitationList from '@/components/invitations/pending-list'
import DeleteLedgerDialog from '@/components/ledgers/delete-dialog'
import LeaveLedgerDialog from '@/components/ledgers/leave-dialog'
import LedgerList from '@/components/ledgers/list'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ledgersKeys, myInvitationsKeys } from '@/query-keys'

export const Route = createFileRoute('/_dashboard/ledgers/')({
    component: LedgersPage
})

function LedgersPage() {
    const ledgers = useQuery({
        queryKey: ledgersKeys.all,
        queryFn: getLedgers
    })

    const invitations = useQuery({
        queryKey: myInvitationsKeys.all,
        queryFn: getMyInvitations
    })

    return (
        <div className="container mx-auto space-y-8 px-5 py-6">
            <DeleteLedgerDialog />
            <LeaveLedgerDialog />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-bold text-2xl">Ledgers</h1>
                    <p className="text-muted-foreground text-sm">
                        Each ledger holds its own entries and its own people.
                    </p>
                </div>
                <Button
                    onClick={() =>
                        ledgerHandler.openWithPayload({ type: 'create' })
                    }
                >
                    <Plus className="size-4" />
                    New ledger
                </Button>
            </div>

            {invitations.data && invitations.data.length > 0 && (
                <section className="space-y-3">
                    <h2 className="font-semibold text-lg">
                        Pending invitations
                    </h2>
                    <PendingInvitationList invitations={invitations.data} />
                </section>
            )}

            {ledgers.isPending ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
            ) : ledgers.isError ? (
                <p className="text-destructive text-sm">
                    {ledgers.error.message}
                </p>
            ) : (
                <LedgerList ledgers={ledgers.data} />
            )}
        </div>
    )
}
