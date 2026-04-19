import type { Context } from "hono"
import type { CookieOptions } from "hono/utils/cookie"
import { setCookie as honoSetCookie } from "hono/cookie"

import type { AppBindings } from "@workers/types"

export const COOKIES = {
  LEDGER: "ledger_token"
}

export const setCookie = (
  ctx: Context<AppBindings>,
  name: string,
  value: string,
  options?: CookieOptions
) =>
  honoSetCookie(ctx, name, value, {
    maxAge: 60 * 60 * 24 * 8,
    ...options
  })
