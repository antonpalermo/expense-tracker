import { cache } from "react"
import { drizzle } from "drizzle-orm/d1"
import { getCloudflareContext } from "@opennextjs/cloudflare"

import * as schema from "../../database/schema"

export const getDatabase = cache(() => {
  const { env } = getCloudflareContext()
  return drizzle(env.MAIN_DATABASE, { schema })
})

export async function getDatabaseAsync() {
  const { env } = await getCloudflareContext({ async: true })
  return drizzle(env.MAIN_DATABASE, { schema, logger: true })
}

export * from "../../database/schema"
