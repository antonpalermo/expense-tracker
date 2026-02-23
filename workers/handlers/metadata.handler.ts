import { createFactory } from "hono/factory"

import { MetadataService } from "@/services/metadata.service"
import { zValidator } from "@hono/zod-validator"
import { updateMetadataSchema } from "@/database/schema"
import type { AppBindings } from "@/lib/types"
import { HTTPException } from "hono/http-exception"

const factory = createFactory<AppBindings>()

export const updateDefaultLedger = factory.createHandlers(
  zValidator("json", updateMetadataSchema),
  async ctx => {
    const user = ctx.get("user")
    const body = ctx.req.valid("json")

    if (!body.defaults) {
      throw new HTTPException()
    }

    const data = await MetadataService.updateDefault(
      user.id,
      body.defaults.ledger
    )

    return ctx.json(data)
  }
)
