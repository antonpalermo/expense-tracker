import type { z } from 'zod'
import type { selectEntriesSchema } from '../worker/database/schemas/entries'
import type {
    selectLedgerInvitationsSchema,
    selectLedgerMembersSchema,
    selectLedgersSchema
} from '../worker/database/schemas/ledgers'
import type { AssignableRole, LedgerRole } from './lib/roles'

// Every import from ../worker must stay `import type`, or drizzle-orm,
// drizzle-zod and nanoid end up in the client bundle.

export type Entry = z.infer<typeof selectEntriesSchema>
export type EntryPayload = Omit<
    Entry,
    'id' | 'userId' | 'ledgerId' | 'createdAt' | 'updatedAt'
>

export type Ledger = z.infer<typeof selectLedgersSchema>
export type LedgerWithRole = Ledger & { role: LedgerRole }
export type LedgerPayload = { name: string; description?: string | null }

export type LedgerMember = z.infer<typeof selectLedgerMembersSchema> & {
    name: string
    email: string
    image: string | null
    /** 0 until they complete a sign-in. Derived from the absence of an account row. */
    hasSignedIn: number
}

export type LedgerInvitation = z.infer<typeof selectLedgerInvitationsSchema>
export type MyInvitation = {
    id: string
    ledgerId: string
    role: AssignableRole
    expiresAt: Date
    createdAt: Date
    ledgerName: string
    invitedByName: string | null
}

export type InvitePayload = { email: string; role: AssignableRole }
export type InviteResult =
    | { kind: 'joined'; userId: string; role: AssignableRole }
    | { kind: 'invited'; invitation: LedgerInvitation }
