import { env } from "cloudflare:workers"
import { Pool } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-serverless"

import * as schema from "@workers/database/schemas"

const pool = new Pool({ connectionString: env.DABASE_URL })
export const db = drizzle({ client: pool, schema })
