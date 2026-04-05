import { createFactory } from "hono/factory"
import type { AppBindings } from "@workers/types"

import container from "@workers/container"

const factory = createFactory<AppBindings>()

const dependecyInjection = factory.createMiddleware(async (ctx, next) => {
  const scope = container.createScope()
  // setup awilix scope
  ctx.set("container", scope)
  await next()
})

export default dependecyInjection
