import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { removeMember } from '@/apis/members'
import { removeMemberHandler } from '@/components/dialog-handlers'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { ledgersKeys } from '@/query-keys'

export default function RemoveMemberDialog() {
    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: ({
            ledgerId,
            memberId
        }: {
            ledgerId: string
            memberId: string
        }) => removeMember(ledgerId, memberId),
        onSuccess: async (_data, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ledgersKeys.members(variables.ledgerId)
            })
            removeMemberHandler.close()
        }
    })

    return (
        <AlertDialog handle={removeMemberHandler}>
            {({ payload }) => {
                const member = payload as {
                    ledgerId: string
                    memberId: string
                    name: string
                }

                if (!member) {
                    return null
                }

                return (
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Remove {member.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                They lose access to this ledger immediately.
                                Entries they created stay in the ledger.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() =>
                                    toast.promise(
                                        mutation.mutateAsync({
                                            ledgerId: member.ledgerId,
                                            memberId: member.memberId
                                        }),
                                        {
                                            loading: 'Removing...',
                                            success: `${member.name} removed`,
                                            error: error =>
                                                (error as Error).message
                                        }
                                    )
                                }
                            >
                                Remove
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                )
            }}
        </AlertDialog>
    )
}
