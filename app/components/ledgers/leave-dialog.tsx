import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { leaveLedger } from '@/apis/ledgers'
import { leaveLedgerHandler } from '@/components/dialog-handlers'
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

export default function LeaveLedgerDialog() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: leaveLedger,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ledgersKeys.all })
            leaveLedgerHandler.close()
            navigate({ to: '/ledgers' })
        }
    })

    return (
        <AlertDialog handle={leaveLedgerHandler}>
            {({ payload }) => {
                const ledger = payload as { id: string; name: string }

                if (!ledger) {
                    return null
                }

                return (
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Leave {ledger.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                You will lose access to this ledger and its
                                entries. An admin can invite you back later.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() =>
                                    toast.promise(
                                        mutation.mutateAsync(ledger.id),
                                        {
                                            loading: 'Leaving...',
                                            success: `You left ${ledger.name}`,
                                            error: error =>
                                                (error as Error).message
                                        }
                                    )
                                }
                            >
                                Leave
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                )
            }}
        </AlertDialog>
    )
}
