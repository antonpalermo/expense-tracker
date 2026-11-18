import { createAuth } from './worker/auth'
import { createDatabase } from './worker/database/create-db'

const databaseMock = {}
const db = createDatabase(databaseMock)

export const auth = createAuth(db)
