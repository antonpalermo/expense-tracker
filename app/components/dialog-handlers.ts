import { Dialog } from '@base-ui/react'
import { AlertDialog } from '@base-ui/react/alert-dialog'
import type { EntryPayload } from '@/types'

// These handles are module-level singletons and the dialogs they drive are
// mounted globally, so they cannot read a route param — every payload carries
// its own ledgerId.

export type EntryHandlerPayload =
    | { type: 'create'; ledgerId: string }
    | {
          type: 'edit'
          ledgerId: string
          id: string
          data: EntryPayload
      }

export const entryHandler = Dialog.createHandle<EntryHandlerPayload>()
export const deleteEntryHandler = AlertDialog.createHandle<{
    ledgerId: string
    id: string
    name: string
}>()

export type LedgerHandlerPayload =
    | { type: 'create' }
    | {
          type: 'edit'
          id: string
          data: { name: string; description: string | null }
      }

export const ledgerHandler = Dialog.createHandle<LedgerHandlerPayload>()
export const deleteLedgerHandler = AlertDialog.createHandle<{
    id: string
    name: string
}>()
export const leaveLedgerHandler = AlertDialog.createHandle<{
    id: string
    name: string
}>()

export const inviteHandler = Dialog.createHandle<{ ledgerId: string }>()
export const removeMemberHandler = AlertDialog.createHandle<{
    ledgerId: string
    memberId: string
    name: string
}>()
