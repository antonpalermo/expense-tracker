import { Dialog } from '@base-ui/react'
import { AlertDialog } from '@base-ui/react/alert-dialog'
import type { EntryPayload } from '@/types'

export type EntryHandlerPayload =
    | {
          type: 'create'
          id?: string
          data?: EntryPayload
      }
    | { type: 'edit'; id: string; data: Record<string, unknown> }

export const entryHandler = Dialog.createHandle<EntryHandlerPayload>()
export const deleteEntryHandler = AlertDialog.createHandle<{ id: string }>()
