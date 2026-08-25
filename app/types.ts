import type { z } from 'zod'
import type {
    EntriesOrder,
    EntriesSort,
    selectEntriesSchema
} from '../worker/database/schemas/entries'
import type {
    selectLedgerInvitationsSchema,
    selectLedgerMembersSchema,
    selectLedgersSchema
} from '../worker/database/schemas/ledgers'
import type { AssignableRole, LedgerRole } from './lib/roles'

// Every import from ../worker must stay `import type`, or drizzle-orm,
// drizzle-zod and nanoid end up in the client bundle.

// Only the list endpoint joins the author, so the bare row and the joined
// row are separate types — otherwise a create/update response would appear to
// carry an `authorName` it never has.
export type EntryRow = z.infer<typeof selectEntriesSchema>
export type Entry = EntryRow & {
    authorName: string | null
    authorImage: string | null
}
export type EntryPayload = Omit<
    Entry,
    | 'id'
    | 'userId'
    | 'ledgerId'
    | 'createdAt'
    | 'updatedAt'
    | 'type'
    | 'authorName'
    | 'authorImage'
>

export type { EntriesOrder, EntriesSort }

export type EntriesQuery = {
    q?: string
    sort?: EntriesSort
    order?: EntriesOrder
    authorIds?: string[]
    page?: number
}

export type EntriesPage = {
    data: Entry[]
    page: number
    pageSize: number
    total: number
    totalPages: number
}

export type EntriesSummary = {
    balanceTrend: { month: string; balance: number }[]
    totals: { income: number; expense: number }
    byMember: {
        userId: string | null
        name: string | null
        image: string | null
        total: number
    }[]
    topExpenses: {
        id: string
        name: string
        amount: number
        createdAt: Date
    }[]
}

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
