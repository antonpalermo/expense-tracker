import { env } from "cloudflare:workers"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "@workers/database/schemas"

export const db = drizzle(env.DATABASE_URL, { schema })
