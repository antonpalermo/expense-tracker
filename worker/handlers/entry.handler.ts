import { createFactory } from "hono/factory"
import type { AppBindings } from "@workers/types"

import * as HTTPStatus from "@workers/status-codes"
// import * as HTTPPhrases from "@workers/status-phrases"

import * as EntryService from "@workers/services/entry.service"

const factory = createFactory<AppBindings>()

export const createEntry = factory.createHandlers(async ctx => {
  const user = ctx.get("user")
  // const data = ctx.req.valid('')

  const entry = await EntryService.createEntry({
    name: "",
    userId: user.id
  })

  return ctx.json(entry, HTTPStatus.CREATED)
})
