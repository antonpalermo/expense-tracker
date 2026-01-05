import { Hono } from "hono"

import type { AppBindings } from "@workers/lib/types"

import { notFound } from "@workers/middlewares/not-found"
import { configureBetterAuth } from "@workers/lib/configure-better-auth"

const app = new Hono<AppBindings>().basePath("/api")

configureBetterAuth(app)

app.notFound(notFound)

export default app
