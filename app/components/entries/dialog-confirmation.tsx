import { useMutation, useQueryClient } from '@tanstack/react-query'
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
        mutationFn: removeEntry,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [entriesKeys.all] })
            deleteEntryHandler.close()
        }
    })

    return (
        <AlertDialog handle={deleteEntryHandler}>
            {({ payload }) => (
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete your entry and remove your data from our
                            servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                const entry = payload as { id: string }
                                mutation.mutate(entry.id)
                            }}
                        >
                            Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            )}
        </AlertDialog>
    )
}
