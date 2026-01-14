import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

import { getCloudflareContext } from "@opennextjs/cloudflare"
import { getDatabaseAsync } from "./database"

import * as schema from "../../database/schema"

async function authBuilder() {
  const databaseInstance = await getDatabaseAsync()

  const { env } = await getCloudflareContext({ async: true })

  return betterAuth({
    appName: "Express Tracker",
    database: drizzleAdapter(databaseInstance, { provider: "pg", schema }),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET
  })
}

let authInstance: Awaited<ReturnType<typeof authBuilder>> | null = null

export async function initAuth() {
  if (!authInstance) {
    authInstance = await authBuilder()
  }
  return authInstance
}

export const auth = betterAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  database: drizzleAdapter(process.env.CLOUDFLARE_D1_ID as any, {
    provider: "pg"
  })
})
