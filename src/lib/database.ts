import { cache } from "react"
import { drizzle } from "drizzle-orm/neon-serverless"
import { getCloudflareContext } from "@opennextjs/cloudflare"

import * as schema from "../../database/schema"

export const getDatabase = cache(() => {
  const { env } = getCloudflareContext()
  return drizzle(env.DATABASE_URL, { schema })
})

export async function getDatabaseAsync() {
  const { env } = await getCloudflareContext({ async: true })
  return drizzle(env.DATABASE_URL, { schema, logger: true })
}

export * from "../../database/schema"
