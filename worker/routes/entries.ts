import { Hono } from "hono"

import type { HonoBindings } from "../index"

import { validate } from "@/lib/validator"
import { insertEntriesSchema, updateEntriesSchema } from "@/database/schemas"

import * as HTTPStatus from "@/status-codes"
// import * as HTTPPhrases from "@/status-phrases"
import * as EntriesService from "@/services/entries"

const routes = new Hono<HonoBindings>({ strict: false }).basePath("/entries")

routes
    .get("/", async ctx => {
        return ctx.json(await EntriesService.getEntries())
    })
    .post("/", validate("json", insertEntriesSchema), async ctx => {
        const data = ctx.req.valid("json")
        const newEntry = await EntriesService.create(data)
        return ctx.json(newEntry, HTTPStatus.CREATED)
    })
    .patch("/:id", validate("json", updateEntriesSchema), ctx => {
        const method = ctx.req.method
        const id = ctx.req.param("id")
        return ctx.json({ msg: "hello from " + method + id })
    })

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
            await EntriesService.remove(id)
            return ctx.json({ msg: id + "successfully deleted" })
        }
    }
})

export default routes
