import { useQueryClient, useMutation } from "@tanstack/react-query"

import {
    AlertDialog,
    AlertDialogTitle,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription
} from "@/components/ui/alert-dialog"
import { deleteEntryHandler } from "@/components/dialog-handlers"

import { entriesKeys } from "@/query-keys"
import { removeEntry } from "@/apis/entries"

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
