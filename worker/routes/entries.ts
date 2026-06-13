import { Hono } from "hono"

import type { Field } from "../bindings"
import type { HonoBindings } from "../index"

import { validate } from "@/lib/validator"
import { entriesInsertSchema } from "@/database/schemas"

import * as HTTPStatus from "@/status-codes"
// import * as HTTPPhrases from "@/status-phrases"
import * as EntriesService from "@/services/entries"

const routes = new Hono<HonoBindings>({ strict: false }).basePath("/entries")

routes.on(
    ["POST", "GET"],
    "/",
    validate("json", entriesInsertSchema),
    async ctx => {
        const method = ctx.req.method

        switch (method) {
            case "GET": {
                return ctx.json({ msg: "hello from " + method })
            }
            case "POST": {
                const data = ctx.req.valid("json")
                const newEntry = await EntriesService.create(data)
                return ctx.json(newEntry, HTTPStatus.CREATED)
            }
        }
    }
)

routes.on(["GET", "PATCH", "DELETE"], "/:id", async ctx => {
    const method = ctx.req.method
    const id = ctx.req.param("id")

    switch (method) {
        case "GET": {
            return ctx.json({ msg: "hello from " + method + id })
        }
        case "PATCH": {
            return ctx.json({ msg: "hello from " + method + id })
        }
        case "DELETE": {
            return ctx.json({ msg: "hello from " + method + id })
        }
    }
})

export default routes
