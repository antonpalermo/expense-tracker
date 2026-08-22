import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { type LedgerHandlerPayload, ledgerHandler } from '../dialog-handlers'
import LedgerForm from './form'

export default function LedgerFormDialog() {
    return (
        <Dialog handle={ledgerHandler}>
            {({ payload }) => {
                const ledger = payload as LedgerHandlerPayload

                if (!ledger) {
                    return null
                }

                return (
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {ledger.type === 'create'
                                    ? 'Create a ledger'
                                    : `Rename ${ledger.data.name}`}
                            </DialogTitle>
                            <DialogDescription>
                                {ledger.type === 'create'
                                    ? 'A ledger holds entries and the people you share them with.'
                                    : 'Update this ledger’s name and description.'}
                            </DialogDescription>
                        </DialogHeader>
                        {ledger.type === 'edit' ? (
                            <LedgerForm
                                type="edit"
                                id={ledger.id}
                                resetData={ledger.data}
                            />
                        ) : (
                            <LedgerForm type="create" />
                        )}
                    </DialogContent>
                )
            }}
        </Dialog>
    )
}
