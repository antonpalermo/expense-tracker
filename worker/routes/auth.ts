import { auth } from "@/lib/auth"
import { Hono } from "hono"
import type { HonoBindings } from ".."

const routes = new Hono<HonoBindings>({ strict: false }).basePath("/auth")

routes.on(["POST", "GET"], "*", ctx => {
    return auth.handler(ctx)
})
