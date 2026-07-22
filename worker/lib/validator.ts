import type { ValidationTargets } from 'hono'
import { validator } from 'hono/validator'
import type { z } from 'zod'

import * as HTTPStatus from '@/status-codes'
import * as HTTPPhrases from '@/status-phrases'

export function validate<
    T extends keyof ValidationTargets,
    S extends z.ZodObject
>(target: T, schema: S) {
    return validator(target, async (value, ctx) => {
        const parsedInput = schema.safeParse(value)

        if (!parsedInput.success) {
            return ctx.json(
                { msg: HTTPPhrases.BAD_REQUEST },
                HTTPStatus.BAD_REQUEST
            )
        }

        return parsedInput.data
    })
}
