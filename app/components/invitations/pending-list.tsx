import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { acceptInvitation, declineInvitation } from '@/apis/invitations'
import RoleBadge from '@/components/role-badge'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardAction,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { ledgersKeys, myInvitationsKeys } from '@/query-keys'
import type { MyInvitation } from '@/types'

export default function PendingInvitationList({
    invitations
}: {
    invitations: MyInvitation[]
}) {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const invalidate = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: myInvitationsKeys.all }),
            queryClient.invalidateQueries({ queryKey: ledgersKeys.all })
        ])
    }

    const accept = useMutation({
        mutationFn: acceptInvitation,
        onSuccess: invalidate
    })

    const decline = useMutation({
        mutationFn: declineInvitation,
        onSuccess: invalidate
    })

    if (invitations.length === 0) {
        return (
            <Card className="py-10 text-center">
                <CardHeader>
                    <CardTitle>No pending invitations</CardTitle>
                    <CardDescription>
                        When someone invites you to a ledger, it shows up here.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <div className="grid gap-4">
            {invitations.map(invitation => (
                <Card key={invitation.id}>
                    <CardHeader>
                        <CardTitle>{invitation.ledgerName}</CardTitle>
                        <CardDescription>
                            {invitation.invitedByName ?? 'Someone'} invited you
                            to join as <RoleBadge role={invitation.role} />
                        </CardDescription>
                        <CardAction>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    onClick={() =>
                                        toast.promise(
                                            decline.mutateAsync(invitation.id),
                                            {
                                                loading: 'Declining...',
                                                success: 'Invitation declined',
                                                error: error =>
                                                    (error as Error).message
                                            }
                                        )
                                    }
                                >
                                    Decline
                                </Button>
                                <Button
                                    onClick={() =>
                                        toast.promise(
                                            accept.mutateAsync(invitation.id),
                                            {
                                                loading: 'Joining...',
                                                success: result => {
                                                    navigate({
                                                        to: '/ledgers/$ledgerId',
                                                        params: {
                                                            ledgerId:
                                                                result.ledgerId
                                                        }
                                                    })
                                                    return `You joined ${invitation.ledgerName}`
                                                },
                                                error: error =>
                                                    (error as Error).message
                                            }
                                        )
                                    }
                                >
                                    Accept
                                </Button>
                            </div>
                        </CardAction>
                    </CardHeader>
                </Card>
            ))}
        </div>
    )
}
