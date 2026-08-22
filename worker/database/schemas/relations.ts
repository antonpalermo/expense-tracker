/**
 * All `relations()` declarations live here, apart from the table definitions.
 *
 * Keeping them alongside the tables created import cycles (entries <-> auth,
 * entries <-> ledgers), which degraded drizzle-zod's inference — `ledger_id`
 * came out as `Buffer` and `user_id` as `any` instead of `string`. With the
 * relations extracted, the table modules form a plain acyclic graph.
 */
import { relations } from 'drizzle-orm'
import { account, session, user } from './auth'
import { entriesTable } from './entries'
import { formTable } from './form'
import {
    ledgerInvitationsTable,
    ledgerMembersTable,
    ledgersTable
} from './ledgers'

export const userRelations = relations(user, ({ many }) => ({
    sessions: many(session),
    accounts: many(account),
    entries: many(entriesTable),
    memberships: many(ledgerMembersTable)
}))

export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, { fields: [session.userId], references: [user.id] })
}))

export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, { fields: [account.userId], references: [user.id] })
}))

export const entriesRelations = relations(entriesTable, ({ one }) => ({
    user: one(user, {
        fields: [entriesTable.userId],
        references: [user.id]
    }),
    ledger: one(ledgersTable, {
        fields: [entriesTable.ledgerId],
        references: [ledgersTable.id]
    })
}))

export const ledgersRelations = relations(ledgersTable, ({ many, one }) => ({
    members: many(ledgerMembersTable),
    invitations: many(ledgerInvitationsTable),
    entries: many(entriesTable),
    form: one(formTable),
    creator: one(user, {
        fields: [ledgersTable.createdBy],
        references: [user.id]
    })
}))

export const ledgerMembersRelations = relations(
    ledgerMembersTable,
    ({ one }) => ({
        ledger: one(ledgersTable, {
            fields: [ledgerMembersTable.ledgerId],
            references: [ledgersTable.id]
        }),
        user: one(user, {
            fields: [ledgerMembersTable.userId],
            references: [user.id]
        })
    })
)

export const ledgerInvitationsRelations = relations(
    ledgerInvitationsTable,
    ({ one }) => ({
        ledger: one(ledgersTable, {
            fields: [ledgerInvitationsTable.ledgerId],
            references: [ledgersTable.id]
        }),
        inviter: one(user, {
            fields: [ledgerInvitationsTable.invitedBy],
            references: [user.id]
        })
    })
)

export const formRelations = relations(formTable, ({ one }) => ({
    ledger: one(ledgersTable, {
        fields: [formTable.ledgerId],
        references: [ledgersTable.id]
    })
}))
