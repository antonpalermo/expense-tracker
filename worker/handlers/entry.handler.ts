import { createFactory } from "hono/factory"
import { zValidator } from "@hono/zod-validator"

import { insertEntrySchema } from "@workers/database/schemas"
import type { AppBindings } from "@workers/types"

import * as HTTPStatus from "@workers/status-codes"
// import * as HTTPPhrases from "@workers/status-phrases"
import * as EntryService from "@workers/services/entry.service"

const factory = createFactory<AppBindings>()

export const getEntries = factory.createHandlers(async ctx => {
  const user = ctx.get("user")
  const entries = await EntryService.getEntries(user.id)

  return ctx.json(entries, HTTPStatus.OK)
})

export const createEntry = factory.createHandlers(
  zValidator("json", insertEntrySchema.omit({ userId: true })),
  async ctx => {
    const user = ctx.get("user")
    const data = ctx.req.valid("json")

    const entry = await EntryService.createEntry({
      name: data.name,
      ledgerId: "",
      userId: user.id
    })

    return ctx.json(entry, HTTPStatus.CREATED)
  }
)
