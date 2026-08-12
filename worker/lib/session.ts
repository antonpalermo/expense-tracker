import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { HonoBindings } from '../index'
import { auth } from './auth'

export const session = createMiddleware<HonoBindings>(async (ctx, next) => {
    const session = await auth.api.getSession({ headers: ctx.req.raw.headers })

    if (ctx.req.path.includes('/auth')) {
        return await next()
    }

    if (!session) {
        throw new HTTPException(401)
    }

    ctx.set('user', session.user)
    ctx.set('session', session.session)

    await next()
})
