import { sql } from 'drizzle-orm'
import {
    index,
    integer,
    sqliteTable,
    text,
    uniqueIndex
} from 'drizzle-orm/sqlite-core'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import nanoid from '../../lib/nanoid'
import { user } from './auth'

export const LEDGER_ROLES = ['viewer', 'member', 'admin', 'owner'] as const
// `owner` is never assignable directly — it moves only via POST /transfer.
export const ASSIGNABLE_ROLES = ['viewer', 'member', 'admin'] as const
export const INVITATION_STATUSES = [
    'pending',
    'accepted',
    'declined',
    'revoked'
] as const

export type LedgerRole = (typeof LEDGER_ROLES)[number]
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number]
export type InvitationStatus = (typeof INVITATION_STATUSES)[number]

export const ledgersTable = sqliteTable(
    'ledgers',
    {
        id: text('id')
            .primaryKey()
            .$defaultFn(() => nanoid()),
        name: text('name').notNull(),
        description: text('description'),
        // Provenance only. The owner is the `ledger_members` row with role
        // 'owner' — never read this column for authorization.
        createdBy: text('created_by').references(() => user.id, {
            onDelete: 'set null'
        }),
        createdAt: integer('created_at', { mode: 'timestamp_ms' })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .notNull(),
        updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull()
    },
    table => [index('ledgers_created_by_index').on(table.createdBy)]
)

export const ledgerMembersTable = sqliteTable(
    'ledger_members',
    {
        id: text('id')
            .primaryKey()
            .$defaultFn(() => nanoid()),
        ledgerId: text('ledger_id')
            .notNull()
            .references(() => ledgersTable.id, { onDelete: 'cascade' }),
        userId: text('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        role: text('role', { enum: LEDGER_ROLES }).notNull().default('member'),
        createdAt: integer('created_at', { mode: 'timestamp_ms' })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .notNull(),
        updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull()
    },
    table => [
        // One membership per user per ledger. Doubles as the covering index for
        // the authorization lookup in worker/lib/ledger-access.ts.
        uniqueIndex('ledger_members_ledger_user_unique').on(
            table.ledgerId,
            table.userId
        ),
        // Exactly one owner per ledger, enforced by the database.
        uniqueIndex('ledger_members_owner_unique')
            .on(table.ledgerId)
            .where(sql`role = 'owner'`),
        index('ledger_members_user_id_index').on(table.userId)
    ]
)

export const ledgerInvitationsTable = sqliteTable(
    'ledger_invitations',
    {
        id: text('id')
            .primaryKey()
            .$defaultFn(() => nanoid()),
        ledgerId: text('ledger_id')
            .notNull()
            .references(() => ledgersTable.id, { onDelete: 'cascade' }),
        // Always stored trimmed + lowercased. See createInvitationSchema.
        email: text('email').notNull(),
        role: text('role', { enum: ASSIGNABLE_ROLES })
            .notNull()
            .default('member'),
        status: text('status', { enum: INVITATION_STATUSES })
            .notNull()
            .default('pending'),
        invitedBy: text('invited_by').references(() => user.id, {
            onDelete: 'set null'
        }),
        expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
        respondedAt: integer('responded_at', { mode: 'timestamp_ms' }),
        createdAt: integer('created_at', { mode: 'timestamp_ms' })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .notNull(),
        updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull()
    },
    table => [
        // At most one live invite per email per ledger. Partial, so an address
        // can be re-invited after declining or being revoked.
        uniqueIndex('ledger_invitations_pending_unique')
            .on(table.ledgerId, table.email)
            .where(sql`status = 'pending'`),
        index('ledger_invitations_email_index').on(table.email),
        index('ledger_invitations_ledger_id_index').on(table.ledgerId)
    ]
)

// Every text column needs an explicit override: drizzle-zod 0.8.3 against zod
// 4.4.3 infers text() as Buffer/any rather than string. selectEntriesSchema
// already does this column by column.
export const selectLedgersSchema = createSelectSchema(ledgersTable, {
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    createdBy: z.string().nullable()
})

export const selectLedgerMembersSchema = createSelectSchema(
    ledgerMembersTable,
    {
        id: z.string(),
        ledgerId: z.string(),
        userId: z.string(),
        role: z.enum(LEDGER_ROLES)
    }
)

export const selectLedgerInvitationsSchema = createSelectSchema(
    ledgerInvitationsTable,
    {
        id: z.string(),
        ledgerId: z.string(),
        email: z.string(),
        role: z.enum(ASSIGNABLE_ROLES),
        status: z.enum(INVITATION_STATUSES),
        invitedBy: z.string().nullable()
    }
)

// Request bodies are hand-written rather than derived from createInsertSchema:
// worker/lib/validator.ts hands `parsedInput.data` straight to the DB, so a
// derived schema would silently widen the accepted body on every new column.
export const createLedgerSchema = z.object({
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(500).nullish()
})
export const updateLedgerSchema = createLedgerSchema.partial()

export const updateMemberRoleSchema = z.object({
    role: z.enum(ASSIGNABLE_ROLES)
})

export const transferOwnershipSchema = z.object({
    userId: z.string().min(1)
})

export const createInvitationSchema = z.object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    role: z.enum(ASSIGNABLE_ROLES).default('member')
})
