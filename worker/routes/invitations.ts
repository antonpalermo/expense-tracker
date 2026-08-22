import { Hono } from 'hono'
import * as InvitationsService from '@/services/invitations'
import type { HonoBindings } from '../index'

// Not guarded by requireLedgerRole — the invitee is by definition not a member
// yet. Authorization is "the invitation's email equals my session email".
const routes = new Hono<HonoBindings>({ strict: false }).basePath(
    '/invitations'
)

routes
    .get('/', async ctx => {
        return ctx.json(
            await InvitationsService.getMyInvitations(ctx.get('user').email)
        )
    })
    .post('/:invitationId/accept', async ctx => {
        const user = ctx.get('user')

        return ctx.json(
            await InvitationsService.accept(ctx.req.param('invitationId'), {
                userId: user.id,
                email: user.email
            })
        )
    })
    .post('/:invitationId/decline', async ctx => {
        return ctx.json(
            await InvitationsService.decline(ctx.req.param('invitationId'), {
                email: ctx.get('user').email
            })
        )
    })

export default routes
