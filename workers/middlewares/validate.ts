import { validator } from "hono/validator"
import { type ValidationTargets } from "hono"

import z from "zod"

import * as HTTPStatus from "../status-codes"
import * as HTTPPhrases from "../status-phrases"
import { HTTPException } from "hono/http-exception"

export function validate<
  T extends keyof ValidationTargets,
  S extends z.ZodObject
>(target: T, schema: S) {
  return validator(target, async value => {
    const sanitizedData = schema.safeParse(value)

    if (!sanitizedData.success) {
      throw new HTTPException(HTTPStatus.BAD_REQUEST, {
        cause: HTTPPhrases.BAD_REQUEST
      })
    }

    return sanitizedData
  })
}
