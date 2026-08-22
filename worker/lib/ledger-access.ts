import { and, eq } from 'drizzle-orm'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { db } from '@/database/db'
import { type LedgerRole, ledgerMembersTable } from '@/database/schemas'
import * as HTTPStatus from '@/status-codes'
import type { HonoBindings } from '../index'

export const ROLE_RANK: Record<LedgerRole, number> = {
    viewer: 1,
    member: 2,
    admin: 3,
    owner: 4
}

export function hasRole(role: LedgerRole, required: LedgerRole) {
    return ROLE_RANK[role] >= ROLE_RANK[required]
}

/** true when `actor` may administer `target` — strictly higher rank */
export function outranks(actor: LedgerRole, target: LedgerRole) {
    return ROLE_RANK[actor] > ROLE_RANK[target]
}

export async function getLedgerRole(ledgerId: string, userId: string) {
    const [membership] = await db
        .select({ role: ledgerMembersTable.role })
        .from(ledgerMembersTable)
        .where(
            and(
                eq(ledgerMembersTable.ledgerId, ledgerId),
                eq(ledgerMembersTable.userId, userId)
            )
        )
        .limit(1)

    return membership?.role ?? null
}

/**
 * Resolves the caller's role for the `:ledgerId` route param and rejects below
 * `required`. Attach it per-route (not via `.use('*')`) so the param resolves,
 * and before `validate` so an unauthorized caller never has its body parsed.
 */
export function requireLedgerRole(required: LedgerRole) {
    return createMiddleware<HonoBindings>(async (ctx, next) => {
        const ledgerId = ctx.req.param('ledgerId')

        if (!ledgerId) {
            throw new HTTPException(HTTPStatus.BAD_REQUEST, {
                message: 'missing ledger id'
            })
        }

        const role = await getLedgerRole(ledgerId, ctx.get('user').id)

        // 404 rather than 403 when there is no membership at all, so we do not
        // leak which ledger ids exist.
        if (!role) {
            throw new HTTPException(HTTPStatus.NOT_FOUND, {
                message: 'ledger not found'
            })
        }

        if (!hasRole(role, required)) {
            throw new HTTPException(HTTPStatus.FORBIDDEN, {
                message: `this action requires the ${required} role`
            })
        }

        ctx.set('ledgerId', ledgerId)
        ctx.set('ledgerRole', role)

        await next()
    })
}
