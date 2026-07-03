import type { EntryPayload } from "@/types"
import { Dialog } from "@base-ui/react"
import { AlertDialog } from "@base-ui/react/alert-dialog"

export type EntryHandlerPayload = {
    type: "create" | "edit"
    data?: EntryPayload
}

export const entryHandler = Dialog.createHandle<EntryHandlerPayload>()
export const deleteEntryHandler = AlertDialog.createHandle<{ id: string }>()
