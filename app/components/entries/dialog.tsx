import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
import EntryForm from "./form"
import { entryHandler, type EntryHandlerPayload } from "../dialog-handlers"

export default function EntryFormDialog() {
    return (
        <Dialog handle={entryHandler}>
            {({ payload }) => {
                const entry = payload as EntryHandlerPayload

                if (!entry) {
                    return null
                }

                return (
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {entry.type === "create"
                                    ? "Create new entry"
                                    : `Update ${entry.data?.name}`}
                            </DialogTitle>
                            <DialogDescription>
                                {entry.type === "create"
                                    ? "Creates new transaction entry"
                                    : "Updates currently selected entry"}
                            </DialogDescription>
                        </DialogHeader>
                        {entry.type === "edit" ? (
                            <EntryForm
                                type="edit"
                                id={entry.id!}
                                resetData={entry.data ?? {}}
                            />
                        ) : (
                            <EntryForm type="create" />
                        )}
                    </DialogContent>
                )
            }}
        </Dialog>
    )
}
