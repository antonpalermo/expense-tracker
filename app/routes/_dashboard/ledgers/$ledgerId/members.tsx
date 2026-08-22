import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getLedgerInvitations } from '@/apis/invitations'
import { getLedger } from '@/apis/ledgers'
import { getMembers } from '@/apis/members'
import InviteForm from '@/components/members/invite-form'
import MemberList from '@/components/members/list'
import RemoveMemberDialog from '@/components/members/remove-dialog'
import RoleGate from '@/components/role-gate'
import { Badge } from '@/components/ui/badge'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { hasRole } from '@/lib/roles'
import { ledgersKeys } from '@/query-keys'

export const Route = createFileRoute('/_dashboard/ledgers/$ledgerId/members')({
    component: MembersPage
})

function MembersPage() {
    const { ledgerId } = Route.useParams()
    const { user } = Route.useRouteContext()

    const { data: ledger } = useQuery({
        queryKey: ledgersKeys.detail(ledgerId),
        queryFn: () => getLedger(ledgerId)
    })

    const members = useQuery({
        queryKey: ledgersKeys.members(ledgerId),
        queryFn: () => getMembers(ledgerId)
    })

    const role = ledger?.role

    const invitations = useQuery({
        queryKey: ledgersKeys.invitations(ledgerId),
        queryFn: () => getLedgerInvitations(ledgerId),
        enabled: Boolean(role && hasRole(role, 'admin'))
    })

    const pendingInvitations =
        invitations.data?.filter(invite => invite.status === 'pending') ?? []

    return (
        <div className="space-y-6">
            <RemoveMemberDialog />

            <RoleGate role={role} required="admin">
                <Card>
                    <CardHeader>
                        <CardTitle>Invite someone</CardTitle>
                        <CardDescription>
                            Enter an email address and pick what they can do.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {role && (
                            <InviteForm ledgerId={ledgerId} actorRole={role} />
                        )}
                    </CardContent>
                </Card>
            </RoleGate>

            {pendingInvitations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Awaiting a response</CardTitle>
                        <CardDescription>
                            These people already have an account, so they choose
                            whether to join.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {pendingInvitations.map(invite => (
                            <div
                                key={invite.id}
                                className="flex items-center justify-between text-sm"
                            >
                                <span>{invite.email}</span>
                                <Badge variant="secondary">
                                    Invited as {invite.role}
                                </Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <section className="space-y-3">
                <h2 className="font-bold text-2xl">Members</h2>
                {members.isPending || !role ? (
                    <Skeleton className="h-48" />
                ) : members.isError ? (
                    <p className="text-destructive text-sm">
                        {members.error.message}
                    </p>
                ) : (
                    <MemberList
                        ledgerId={ledgerId}
                        members={members.data}
                        actorRole={role}
                        currentUserId={user?.id}
                    />
                )}
            </section>
        </div>
    )
}
