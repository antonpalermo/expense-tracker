import { Hono } from 'hono'
import {
    createEntrySchema,
    entriesQuerySchema,
    updateEntrySchema
} from '@/database/schemas'
import { requireLedgerRole } from '@/lib/ledger-access'
import { validate } from '@/lib/validator'
import * as EntriesService from '@/services/entries'
import * as HTTPStatus from '@/status-codes'
import type { HonoBindings } from '../index'

const routes = new Hono<HonoBindings>({ strict: false }).basePath(
    '/ledgers/:ledgerId/entries'
)

routes
    .get(
        '/',
        requireLedgerRole('viewer'),
        validate('query', entriesQuerySchema),
        async ctx => {
            return ctx.json(
                await EntriesService.getEntries(
                    ctx.get('ledgerId'),
                    ctx.req.valid('query')
                )
            )
        }
    )
    .get('/summary', requireLedgerRole('viewer'), async ctx => {
        return ctx.json(await EntriesService.getSummary(ctx.get('ledgerId')))
    })
    .post(
        '/',
        requireLedgerRole('member'),
        validate('json', createEntrySchema),
        async ctx => {
            const entry = await EntriesService.create(
                ctx.get('ledgerId'),
                ctx.get('user').id,
                ctx.req.valid('json')
            )

            return ctx.json(entry, HTTPStatus.CREATED)
        }
    )
    .get('/:entryId', requireLedgerRole('viewer'), async ctx => {
        return ctx.json(
            await EntriesService.getEntry(
                ctx.get('ledgerId'),
                ctx.req.param('entryId')
            )
        )
    })
    .patch(
        '/:entryId',
        requireLedgerRole('member'),
        validate('json', updateEntrySchema),
        async ctx => {
            return ctx.json(
                await EntriesService.update(
                    ctx.get('ledgerId'),
                    ctx.req.param('entryId'),
                    ctx.req.valid('json')
                )
            )
        }
    )
    .delete('/:entryId', requireLedgerRole('member'), async ctx => {
        const entryId = ctx.req.param('entryId')
        await EntriesService.remove(ctx.get('ledgerId'), entryId)

        return ctx.json({ msg: `entry ${entryId} successfully deleted` })
    })

export default routes
