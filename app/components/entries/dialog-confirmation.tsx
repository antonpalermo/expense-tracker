import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { removeEntry } from '@/apis/entries'
import { deleteEntryHandler } from '@/components/dialog-handlers'
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
import { entriesKeys } from '@/query-keys'

export default function DialogConfirmation() {
    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: ({ ledgerId, id }: { ledgerId: string; id: string }) =>
            removeEntry(ledgerId, id),
        onSuccess: async (_data, variables) => {
            await queryClient.invalidateQueries({
                queryKey: entriesKeys.byLedgerAll(variables.ledgerId)
            })
            deleteEntryHandler.close()
        }
    })

    return (
        <AlertDialog handle={deleteEntryHandler}>
            {({ payload }) => {
                const entry = payload as {
                    ledgerId: string
                    id: string
                    name: string
                }

                if (!entry) {
                    return null
                }

                return (
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Delete {entry.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                This permanently deletes the entry for everyone
                                this ledger is shared with. This cannot be
                                undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() =>
                                    toast.promise(
                                        mutation.mutateAsync({
                                            ledgerId: entry.ledgerId,
                                            id: entry.id
                                        }),
                                        {
                                            loading: 'Deleting...',
                                            success: `${entry.name} deleted`,
                                            error: error =>
                                                (error as Error).message
                                        }
                                    )
                                }
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                )
            }}
        </AlertDialog>
    )
}
