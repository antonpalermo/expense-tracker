import { env } from "cloudflare:workers"
import { drizzle } from "drizzle-orm/d1"

import * as schema from "@workers/database/schemas"

export const db = drizzle(env.DB, { schema })
