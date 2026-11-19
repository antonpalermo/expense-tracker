import { Hono } from 'hono'

import * as HTTPStatus from '@/status-codes'
import * as HTTPPhrases from '@/status-phrases'

export type HonoBindings = {
    Bindings: CloudflareBindings
}

const app = new Hono<HonoBindings>({ strict: false }).basePath('/api')

app.notFound(ctx => {
    return ctx.json(
        {
            method: ctx.req.method,
            path: ctx.req.path,
            message: HTTPPhrases.NOT_FOUND
        },
        HTTPStatus.NOT_FOUND
    )
})

app.onError((error, ctx) => {
    // TODO: enhance error logging here
    // check if error instance is of type HTTPError or DrizzleError
    console.log(error)

    return ctx.json(
        {
            method: ctx.req.method,
            path: ctx.req.path,
            message: HTTPPhrases.INTERNAL_SERVER_ERROR
        },
        HTTPStatus.INTERNAL_SERVER_ERROR
    )
})

export default app
