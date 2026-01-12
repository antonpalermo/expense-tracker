import { Hono } from "hono"

import type { AppBindings } from "@workers/lib/types"

import { configureBetterAuth } from "@workers/lib/configure-better-auth"

import { session } from "@workers/middlewares/session"
import { database } from "@workers/middlewares/database"
import { notFound } from "@workers/middlewares/not-found"

const app = new Hono<AppBindings>().basePath("/api")

configureBetterAuth(app)

app.use(session).use(database)

app.notFound(notFound)

export default app
