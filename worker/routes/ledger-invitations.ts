import { Hono } from 'hono'
import { createInvitationSchema } from '@/database/schemas'
import { sendLedgerInvite } from '@/lib/email'
import { requireLedgerRole } from '@/lib/ledger-access'
import { validate } from '@/lib/validator'
import * as InvitationsService from '@/services/invitations'
import * as LedgersService from '@/services/ledgers'
import * as HTTPStatus from '@/status-codes'
import type { HonoBindings } from '../index'

const routes = new Hono<HonoBindings>({ strict: false }).basePath(
    '/ledgers/:ledgerId/invitations'
)

routes
    .get('/', requireLedgerRole('admin'), async ctx => {
        return ctx.json(
            await InvitationsService.getLedgerInvitations(ctx.get('ledgerId'))
        )
    })
    .post(
        '/',
        requireLedgerRole('admin'),
        validate('json', createInvitationSchema),
        async ctx => {
            const ledgerId = ctx.get('ledgerId')
            const { email, role } = ctx.req.valid('json')
            const actor = ctx.get('user')

            const result = await InvitationsService.invite(
                ledgerId,
                email,
                role,
                {
                    userId: actor.id,
                    email: actor.email,
                    role: ctx.get('ledgerRole')
                }
            )

            const ledger = await LedgersService.getLedger(ledgerId)

            // The row is already committed — a failed send must not fail the
            // request, since the invite works without the email.
            try {
                await sendLedgerInvite({
                    to: email,
                    ledgerName: ledger.name,
                    inviterName: actor.name,
                    url: new URL(
                        result.kind === 'joined' ? '/' : '/invitations',
                        ctx.req.url
                    ).toString(),
                    kind: result.kind === 'joined' ? 'join' : 'review'
                })
            } catch (error) {
                console.error('[email] invite failed', error)
            }

            return ctx.json(result, HTTPStatus.CREATED)
        }
    )
    .delete('/:invitationId', requireLedgerRole('admin'), async ctx => {
        return ctx.json(
            await InvitationsService.revoke(
                ctx.get('ledgerId'),
                ctx.req.param('invitationId')
            )
        )
    })

export default routes
