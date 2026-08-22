import { Hono } from 'hono'
import { createFieldSchema } from '@/database/schemas'
import { requireLedgerRole } from '@/lib/ledger-access'
import { validate } from '@/lib/validator'
import * as FormsService from '@/services/forms'
import type { HonoBindings } from '../index'

const routes = new Hono<HonoBindings>({ strict: false }).basePath(
    '/ledgers/:ledgerId/forms'
)

routes
    .get('/schema', requireLedgerRole('viewer'), async ctx => {
        return ctx.json(await FormsService.getFormDetails(ctx.get('ledgerId')))
    })
    // Adding a field changes the form every member's entry screen renders from,
    // so this is ledger configuration, not entry CRUD.
    .patch(
        '/schema',
        requireLedgerRole('admin'),
        validate('json', createFieldSchema),
        async ctx => {
            return ctx.json(
                await FormsService.createField(
                    ctx.get('ledgerId'),
                    ctx.req.valid('json')
                )
            )
        }
    )

export default routes
