import { env } from 'cloudflare:workers'
import { createDatabase } from './create-db'

export const db = createDatabase(env.DATABASE)
