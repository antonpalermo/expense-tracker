import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import authRoutes from '@/routes/auth'
import entryRoutes from '@/routes/entries'
import formRoutes from '@/routes/form'
import invitationRoutes from '@/routes/invitations'
import ledgerInvitationRoutes from '@/routes/ledger-invitations'
import ledgerRoutes from '@/routes/ledgers'
import memberRoutes from '@/routes/members'
import * as HTTPStatus from '@/status-codes'
import * as HTTPPhrases from '@/status-phrases'
import type { LedgerRole } from './database/schemas'
import type { auth } from './lib/auth'
import { session } from './lib/session'

export type HonoBindings = {
    Bindings: CloudflareBindings
    Variables: {
        user: typeof auth.$Infer.Session.user
        session: typeof auth.$Infer.Session.session
        // Set by requireLedgerRole. Only read these on routes it guards — the
        // same discipline `user` already requires.
        ledgerId: string
        ledgerRole: LedgerRole
    }
}

const app = new Hono<HonoBindings>({ strict: false }).basePath('/api')

app.use('*', session)

const routes = [
    authRoutes,
    ledgerRoutes,
    memberRoutes,
    ledgerInvitationRoutes,
    invitationRoutes,
    formRoutes,
    entryRoutes
]

routes.forEach(route => app.route('/', route))

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
