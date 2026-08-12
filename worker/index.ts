import { Hono } from 'hono'
import authRoutes from '@/routes/auth'
import taskRoutes from '@/routes/entries'
import formRoutes from '@/routes/form'
import type { auth } from './lib/auth'
import { session } from './lib/session'

export type HonoBindings = {
    Bindings: CloudflareBindings
    Variables: {
        user: typeof auth.$Infer.Session.user
        session: typeof auth.$Infer.Session.session
    }
}

const app = new Hono<HonoBindings>({ strict: false }).basePath('/api')

app.use('*', session)

const routes = [authRoutes, formRoutes, taskRoutes]

routes.forEach(route => app.route('/', route))

export default app
