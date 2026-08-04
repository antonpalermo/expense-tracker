import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import authRoutes from '@/routes/auth'
import taskRoutes from '@/routes/entries'
import formRoutes from '@/routes/form'
import { auth } from './lib/auth'

export type HonoBindings = {
    Bindings: CloudflareBindings
    Variables: {
        user: typeof auth.$Infer.Session.user
        session: typeof auth.$Infer.Session.session
    }
}

const app = new Hono<HonoBindings>({ strict: false }).basePath('/api')

app.use('*', async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session) {
        throw new HTTPException(401)
    }

    c.set('user', session.user)
    c.set('session', session.session)
    await next()
})

const routes = [authRoutes, formRoutes, taskRoutes]

routes.forEach(route => app.route('/', route))

export default app
