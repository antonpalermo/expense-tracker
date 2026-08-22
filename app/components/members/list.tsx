import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MailPlus } from 'lucide-react'
import { toast } from 'sonner'
import { transferOwnership } from '@/apis/ledgers'
import { resendInvite, updateMemberRole } from '@/apis/members'
import { removeMemberHandler } from '@/components/dialog-handlers'
import RoleBadge from '@/components/role-badge'
import { AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import {
    type AssignableRole,
    hasRole,
    type LedgerRole,
    outranks
} from '@/lib/roles'
import { ledgersKeys } from '@/query-keys'
import type { LedgerMember } from '@/types'
import RoleSelect from './role-select'

export default function MemberList({
    ledgerId,
    members,
    actorRole,
    currentUserId
}: {
    ledgerId: string
    members: LedgerMember[]
    actorRole: LedgerRole
    currentUserId: string | undefined
}) {
    const queryClient = useQueryClient()

    const roleMutation = useMutation({
        mutationFn: ({
            memberId,
            role
        }: {
            memberId: string
            role: AssignableRole
        }) => updateMemberRole(ledgerId, memberId, role),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ledgersKeys.members(ledgerId)
            })
        }
    })

    const resendMutation = useMutation({
        mutationFn: (memberId: string) => resendInvite(ledgerId, memberId)
    })

    // Without this the owner is stuck: they cannot leave a ledger, only delete
    // it, so handing it over has to be reachable from somewhere.
    const transferMutation = useMutation({
        mutationFn: (userId: string) => transferOwnership(ledgerId, userId),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ledgersKeys.members(ledgerId)
                }),
                queryClient.invalidateQueries({
                    queryKey: ledgersKeys.detail(ledgerId)
                }),
                queryClient.invalidateQueries({ queryKey: ledgersKeys.all })
            ])
        }
    })

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-10" />
                </TableRow>
            </TableHeader>
            <TableBody>
                {members.map(member => {
                    const isSelf = member.userId === currentUserId
                    // Same rule the server enforces: you may only act on
                    // someone you strictly outrank.
                    const canManage =
                        !isSelf &&
                        hasRole(actorRole, 'admin') &&
                        outranks(actorRole, member.role)

                    return (
                        <TableRow key={member.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        {member.image && (
                                            <AvatarImage
                                                src={member.image}
                                                alt={member.name}
                                            />
                                        )}
                                        <AvatarFallback>
                                            {member.name
                                                .slice(0, 2)
                                                .toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="font-medium">
                                            {member.name}
                                            {isSelf && (
                                                <span className="text-muted-foreground">
                                                    {' '}
                                                    (you)
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-muted-foreground text-sm">
                                            {member.email}
                                        </span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                {member.hasSignedIn ? (
                                    <Badge variant="outline">Active</Badge>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary">
                                            Pending
                                        </Badge>
                                        {hasRole(actorRole, 'admin') && (
                                            <Button
                                                variant="ghost"
                                                className="h-7 px-2"
                                                onClick={() =>
                                                    toast.promise(
                                                        resendMutation.mutateAsync(
                                                            member.id
                                                        ),
                                                        {
                                                            loading:
                                                                'Sending...',
                                                            success:
                                                                'Invitation resent',
                                                            error: error =>
                                                                (error as Error)
                                                                    .message
                                                        }
                                                    )
                                                }
                                            >
                                                <MailPlus className="size-4" />
                                                <span className="sr-only">
                                                    Resend invitation
                                                </span>
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </TableCell>
                            <TableCell>
                                {canManage && member.role !== 'owner' ? (
                                    <RoleSelect
                                        value={member.role as AssignableRole}
                                        actorRole={actorRole}
                                        disabled={roleMutation.isPending}
                                        onChange={role =>
                                            toast.promise(
                                                roleMutation.mutateAsync({
                                                    memberId: member.id,
                                                    role
                                                }),
                                                {
                                                    loading: 'Updating...',
                                                    success: `${member.name} is now a ${role}`,
                                                    error: error =>
                                                        (error as Error).message
                                                }
                                            )
                                        }
                                    />
                                ) : (
                                    <RoleBadge role={member.role} />
                                )}
                            </TableCell>
                            <TableCell>
                                <div className="flex justify-end gap-1">
                                    {actorRole === 'owner' &&
                                        !isSelf &&
                                        Boolean(member.hasSignedIn) && (
                                            <Button
                                                variant="ghost"
                                                className="h-8 px-2"
                                                onClick={() =>
                                                    toast.promise(
                                                        transferMutation.mutateAsync(
                                                            member.userId
                                                        ),
                                                        {
                                                            loading:
                                                                'Transferring...',
                                                            success: `${member.name} is now the owner`,
                                                            error: error =>
                                                                (error as Error)
                                                                    .message
                                                        }
                                                    )
                                                }
                                            >
                                                Make owner
                                            </Button>
                                        )}
                                    {canManage && (
                                        <Button
                                            variant="ghost"
                                            className="h-8 px-2"
                                            render={
                                                <AlertDialogTrigger
                                                    handle={removeMemberHandler}
                                                    payload={{
                                                        ledgerId,
                                                        memberId: member.id,
                                                        name: member.name
                                                    }}
                                                />
                                            }
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
    )
}
