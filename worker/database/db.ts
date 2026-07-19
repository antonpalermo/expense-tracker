import { env } from 'cloudflare:workers'
import { drizzle } from 'drizzle-orm/d1'

import * as schema from './schemas'

export const db = drizzle(env.DATABASE, { schema })
