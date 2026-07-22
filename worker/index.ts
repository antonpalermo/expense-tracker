import { Hono } from 'hono'
import taskRoutes from '@/routes/entries'
import formRoutes from '@/routes/form'

export type HonoBindings = {
    Bindings: CloudflareBindings
}

const app = new Hono<HonoBindings>({ strict: false }).basePath('/api')
const routes = [formRoutes, taskRoutes]

routes.forEach(route => app.route('/', route))

export default app
