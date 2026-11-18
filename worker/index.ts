import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import entryRoutes from '@/routes/entries'
import formRoutes from '@/routes/form'
import invitationRoutes from '@/routes/invitations'
import ledgerInvitationRoutes from '@/routes/ledger-invitations'
import ledgerRoutes from '@/routes/ledgers'
import memberRoutes from '@/routes/members'
import * as HTTPStatus from '@/status-codes'
import * as HTTPPhrases from '@/status-phrases'

import { createAuth } from './auth'
import { createDatabase } from './database/create-db'

export type HonoBindings = {
    Bindings: CloudflareBindings
}

const app = new Hono<HonoBindings>({ strict: false }).basePath('/api')

const routes = [
    ledgerRoutes,
    memberRoutes,
    ledgerInvitationRoutes,
    invitationRoutes,
    formRoutes,
    entryRoutes
]

routes.forEach(route => app.route('/', route))

app.on(['GET', 'POST'], '/api/auth/*', async ctx => {
    const db = createDatabase(ctx.env.DATABASE)
    const auth = createAuth(db)

    return auth.handler(ctx.req.raw)
})

// Without this every non-HTTPException throw returns a bodiless 500, which the
// frontend's `await response.json()` then chokes on.
app.onError((error, ctx) => {
    if (error instanceof HTTPException) {
        return ctx.json(
            { msg: error.message || HTTPPhrases.INTERNAL_SERVER_ERROR },
            error.status
        )
    }

    console.error(error)

    return ctx.json(
        { msg: HTTPPhrases.INTERNAL_SERVER_ERROR },
        HTTPStatus.INTERNAL_SERVER_ERROR
    )
})

export default app
