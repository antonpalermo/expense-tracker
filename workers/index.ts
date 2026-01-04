import { Hono } from "hono"

import { notFound } from "@workers/middlewares/not-found"

const app = new Hono()

app.notFound(notFound)

export default app
