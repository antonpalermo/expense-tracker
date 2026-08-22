import { Hono } from 'hono'
import { updateMemberRoleSchema } from '@/database/schemas'
import { sendLedgerInvite } from '@/lib/email'
import { requireLedgerRole } from '@/lib/ledger-access'
import { validate } from '@/lib/validator'
import * as LedgersService from '@/services/ledgers'
import * as MembersService from '@/services/members'
import type { HonoBindings } from '../index'

const routes = new Hono<HonoBindings>({ strict: false }).basePath(
    '/ledgers/:ledgerId/members'
)

routes
    .get('/', requireLedgerRole('viewer'), async ctx => {
        return ctx.json(await MembersService.getMembers(ctx.get('ledgerId')))
    })
    .patch(
        '/:memberId',
        requireLedgerRole('admin'),
        validate('json', updateMemberRoleSchema),
        async ctx => {
            return ctx.json(
                await MembersService.updateRole(
                    ctx.get('ledgerId'),
                    ctx.req.param('memberId'),
                    ctx.req.valid('json').role,
                    {
                        userId: ctx.get('user').id,
                        role: ctx.get('ledgerRole')
                    }
                )
            )
        }
    )
    .delete('/:memberId', requireLedgerRole('admin'), async ctx => {
        return ctx.json(
            await MembersService.removeMember(
                ctx.get('ledgerId'),
                ctx.req.param('memberId'),
                { userId: ctx.get('user').id, role: ctx.get('ledgerRole') }
            )
        )
    })
    .post('/:memberId/resend', requireLedgerRole('admin'), async ctx => {
        const ledgerId = ctx.get('ledgerId')
        const member = await MembersService.getMemberUser(
            ledgerId,
            ctx.req.param('memberId')
        )
        const ledger = await LedgersService.getLedger(ledgerId)

        // Delivery must never fail the request.
        try {
            await sendLedgerInvite({
                to: member.email,
                ledgerName: ledger.name,
                inviterName: ctx.get('user').name,
                url: new URL('/', ctx.req.url).toString(),
                kind: 'join'
            })
        } catch (error) {
            console.error('[email] resend failed', error)
        }

        return ctx.json({ msg: 'invitation email resent' })
    })

export default routes
