import type { AppBindings } from "@workers/types"
import type { Context } from "hono"
import { setCookie as honoSetCookie } from "hono/cookie"
import type { CookieOptions } from "hono/utils/cookie"

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
    expires: new Date(Date.now() + 3600 * 1000),
    ...options
  })
