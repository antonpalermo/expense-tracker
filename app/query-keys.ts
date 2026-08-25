import type { EntriesQuery } from '@/types'

export const ledgersKeys = {
    all: ['LEDGERS'] as const,
    detail: (ledgerId: string) => ['LEDGERS', ledgerId] as const,
    members: (ledgerId: string) => ['LEDGERS', ledgerId, 'MEMBERS'] as const,
    invitations: (ledgerId: string) =>
        ['LEDGERS', ledgerId, 'INVITATIONS'] as const
}

export const entriesKeys = {
    all: ['ENTRIES'] as const,
    byLedgerAll: (ledgerId: string) => ['ENTRIES', ledgerId] as const,
    byLedger: (ledgerId: string, query: EntriesQuery) =>
        ['ENTRIES', ledgerId, query] as const,
    summary: (ledgerId: string) => ['ENTRIES', ledgerId, 'SUMMARY'] as const
}

export const myInvitationsKeys = {
    all: ['MY_INVITATIONS'] as const
}

export const formSchemaKeys = {
    byLedger: (ledgerId: string) => ['FORM_SCHEMA', ledgerId] as const
}
