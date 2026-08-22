/**
 * Deliberately duplicated from worker/lib/ledger-access.ts.
 *
 * Importing the worker's values (rather than its types) would pull drizzle-orm,
 * drizzle-zod and nanoid into the client bundle. Six lines is the cheaper cost.
 *
 * This is presentation only — the server re-checks every mutation.
 */
export const LEDGER_ROLES = ['viewer', 'member', 'admin', 'owner'] as const
export const ASSIGNABLE_ROLES = ['viewer', 'member', 'admin'] as const

export type LedgerRole = (typeof LEDGER_ROLES)[number]
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number]

const ROLE_RANK: Record<LedgerRole, number> = {
    viewer: 1,
    member: 2,
    admin: 3,
    owner: 4
}

export const hasRole = (role: LedgerRole, required: LedgerRole) =>
    ROLE_RANK[role] >= ROLE_RANK[required]

export const outranks = (actor: LedgerRole, target: LedgerRole) =>
    ROLE_RANK[actor] > ROLE_RANK[target]

export const ROLE_LABEL: Record<LedgerRole, string> = {
    viewer: 'Viewer',
    member: 'Member',
    admin: 'Admin',
    owner: 'Owner'
}

export const ROLE_DESCRIPTION: Record<LedgerRole, string> = {
    viewer: 'Can view entries but not change them',
    member: 'Can add, edit and delete entries',
    admin: 'Can also invite people and manage members',
    owner: 'Full control, including deleting the ledger'
}
