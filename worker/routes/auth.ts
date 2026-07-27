import { Hono } from 'hono'
import { auth } from '@/lib/auth'
import type { HonoBindings } from '..'

const routes = new Hono<HonoBindings>({ strict: false }).basePath('/auth')

routes.on(['POST', 'GET'], '*', ctx => {
    return auth.handler(ctx)
})

export default routes
