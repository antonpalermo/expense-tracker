import type { EntryPayload } from "@/types"
import { Dialog } from "@base-ui/react"
import { AlertDialog } from "@base-ui/react/alert-dialog"

export const createEntryHandler = Dialog.createHandle<{
    type: "create" | "edit"
    data?: EntryPayload
}>()
export const deleteEntryHandler = AlertDialog.createHandle<{ id: string }>()
