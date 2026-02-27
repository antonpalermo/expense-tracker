import { createFactory } from "hono/factory"

import { auth } from "../lib/auth"
import type { AppBindings } from "@/lib/types"

const factory = createFactory<AppBindings>()

export const setupAuth = factory.createHandlers(ctx =>
  auth.handler(ctx.req.raw)
)
