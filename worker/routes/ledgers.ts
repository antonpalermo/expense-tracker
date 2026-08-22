import { Hono } from 'hono'
import {
    createLedgerSchema,
    transferOwnershipSchema,
    updateLedgerSchema
} from '@/database/schemas'
import { requireLedgerRole } from '@/lib/ledger-access'
import { validate } from '@/lib/validator'
import * as LedgersService from '@/services/ledgers'
import * as HTTPStatus from '@/status-codes'
import type { HonoBindings } from '../index'

const routes = new Hono<HonoBindings>({ strict: false }).basePath('/ledgers')

routes
    .get('/', async ctx => {
        return ctx.json(
            await LedgersService.getLedgersForUser(ctx.get('user').id)
        )
    })
    .post('/', validate('json', createLedgerSchema), async ctx => {
        const ledger = await LedgersService.create(
            ctx.req.valid('json'),
            ctx.get('user').id
        )

        return ctx.json(ledger, HTTPStatus.CREATED)
    })
    .get('/:ledgerId', requireLedgerRole('viewer'), async ctx => {
        const ledger = await LedgersService.getLedger(ctx.get('ledgerId'))

        return ctx.json({ ...ledger, role: ctx.get('ledgerRole') })
    })
    .patch(
        '/:ledgerId',
        requireLedgerRole('admin'),
        validate('json', updateLedgerSchema),
        async ctx => {
            const ledger = await LedgersService.update(
                ctx.get('ledgerId'),
                ctx.req.valid('json')
            )

            return ctx.json({ ...ledger, role: ctx.get('ledgerRole') })
        }
    )
    .delete('/:ledgerId', requireLedgerRole('owner'), async ctx => {
        await LedgersService.remove(ctx.get('ledgerId'))

        return ctx.json({ msg: 'ledger deleted' })
    })
    .post(
        '/:ledgerId/transfer',
        requireLedgerRole('owner'),
        validate('json', transferOwnershipSchema),
        async ctx => {
            return ctx.json(
                await LedgersService.transferOwnership(
                    ctx.get('ledgerId'),
                    ctx.get('user').id,
                    ctx.req.valid('json').userId
                )
            )
        }
    )
    .post('/:ledgerId/leave', requireLedgerRole('viewer'), async ctx => {
        return ctx.json(
            await LedgersService.leave(ctx.get('ledgerId'), ctx.get('user').id)
        )
    })

export default routes
