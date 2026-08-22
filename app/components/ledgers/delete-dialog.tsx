import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { removeLedger } from '@/apis/ledgers'
import { deleteLedgerHandler } from '@/components/dialog-handlers'
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
import { Input } from '@/components/ui/input'
import { ledgersKeys } from '@/query-keys'

/**
 * Deleting a ledger cascades to every member's entries, so this asks for the
 * name to be typed rather than reusing the plain Continue button that the entry
 * confirmation uses.
 */
export default function DeleteLedgerDialog() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [confirmation, setConfirmation] = useState('')

    const mutation = useMutation({
        mutationFn: removeLedger,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ledgersKeys.all })
            deleteLedgerHandler.close()
            setConfirmation('')
            navigate({ to: '/ledgers' })
        }
    })

    return (
        <AlertDialog handle={deleteLedgerHandler}>
            {({ payload }) => {
                const ledger = payload as { id: string; name: string }

                if (!ledger) {
                    return null
                }

                return (
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Delete {ledger.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                This permanently deletes the ledger and every
                                entry in it, for everyone it is shared with.
                                This cannot be undone. Type{' '}
                                <span className="font-medium">
                                    {ledger.name}
                                </span>{' '}
                                to confirm.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Input
                            value={confirmation}
                            onChange={e =>
                                setConfirmation(e.currentTarget.value)
                            }
                            placeholder={ledger.name}
                            autoComplete="off"
                        />
                        <AlertDialogFooter>
                            <AlertDialogCancel
                                onClick={() => setConfirmation('')}
                            >
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                disabled={confirmation !== ledger.name}
                                onClick={() => {
                                    toast.promise(
                                        mutation.mutateAsync(ledger.id),
                                        {
                                            loading: 'Deleting...',
                                            success: `${ledger.name} deleted`,
                                            error: error =>
                                                (error as Error).message
                                        }
                                    )
                                }}
                            >
                                Delete ledger
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                )
            }}
        </AlertDialog>
    )
}
