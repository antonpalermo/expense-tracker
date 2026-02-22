import z from "zod"
import { zValidator } from "@hono/zod-validator"

// 25 lenght alphanumeric characters.
const PATTERN = /^[a-zA-Z0-9]{25}$/

export const validateIDParam = zValidator(
  "param",
  z.object({ id: z.string().regex(PATTERN) })
)
