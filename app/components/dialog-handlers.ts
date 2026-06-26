import { Dialog } from "@base-ui/react"
import { AlertDialog } from "@base-ui/react/alert-dialog"

export const createEntryHandler = Dialog.createHandle()
export const deleteEntryHandler = AlertDialog.createHandle<{ id: string }>()
