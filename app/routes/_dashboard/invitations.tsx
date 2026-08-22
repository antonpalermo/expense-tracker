import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getMyInvitations } from '@/apis/invitations'
import PendingInvitationList from '@/components/invitations/pending-list'
import { Skeleton } from '@/components/ui/skeleton'
import { myInvitationsKeys } from '@/query-keys'

export const Route = createFileRoute('/_dashboard/invitations')({
    component: InvitationsPage
})

function InvitationsPage() {
    const invitations = useQuery({
        queryKey: myInvitationsKeys.all,
        queryFn: getMyInvitations
    })

    return (
        <div className="container mx-auto space-y-6 px-5 py-6">
            <div>
                <h1 className="font-bold text-2xl">Invitations</h1>
                <p className="text-muted-foreground text-sm">
                    Ledgers other people have invited you to join.
                </p>
            </div>

            {invitations.isPending ? (
                <Skeleton className="h-28" />
            ) : invitations.isError ? (
                <p className="text-destructive text-sm">
                    {invitations.error.message}
                </p>
            ) : (
                <PendingInvitationList invitations={invitations.data} />
            )}
        </div>
    )
}
