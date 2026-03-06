import { Hono } from "hono"
import { eq } from "drizzle-orm"

import { db } from "@workers/database/db"
import { user } from "@workers/database/schemas"

import type { AppBindings } from "@workers/types"
import * as handlers from "@workers/handlers/entry.handler"

const routes = new Hono<AppBindings>({ strict: false }).basePath("/entries")

routes
  .get("/", async ctx => {
    const currentUser = ctx.get("user")
    const result = await db.query.entry.findMany({
      where: eq(user.id, currentUser.id)
    })

    return ctx.json(result, 200)
  })
  .post("/", ...handlers.createEntry)

export default routes
