import { betterAuth } from "better-auth"
import { env } from "cloudflare:workers"

export const auth = betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET
})
