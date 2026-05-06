import type { Bindings } from "@/bindings"
import { get, set } from "@/lib/cache"
import { Hono } from "hono"

const routes = new Hono<Bindings>({ strict: false }).basePath("/forms")

export type FieldSchema = {
    id: string
    name: string
    type: "text" | "number"
}

export type FormConfig = {
    fields: FieldSchema[]
}

export const FORM_CONFIG_KEY = "user:form_schema"

async function setFormConfig<T>(value: T) {
    await set<T>(FORM_CONFIG_KEY, value, {
        expirationTtl: 60 * 60 * 24
    })
}

async function createBlankConfig() {
    const blankConfig: FormConfig = {
        fields: [
            {
                id: crypto.randomUUID(),
                name: "Name",
                type: "text"
            },
            {
                id: crypto.randomUUID(),
                name: "Description",
                type: "text"
            },
            {
                id: crypto.randomUUID(),
                name: "Amount",
                type: "number"
            }
        ]
    }

    await setFormConfig(blankConfig)

    return blankConfig
}

async function getConfig(): Promise<FormConfig | undefined> {
    // 1. check if available in kv
    // 2. if available return quickly else fetch from database
    // 3. set in kv then return result

    const schema = await get(FORM_CONFIG_KEY)

    if (!schema) {
        // get in database then set to kv and return schema
        console.log("not available")
        return undefined
    }

    return JSON.parse(schema)
}

async function createField(field: FieldSchema) {
    const schema = await getConfig()

    if (!schema) {
        console.log("no schema available")
        return
    }

    schema.fields.push(field)
    await setFormConfig(schema)

    return schema
}

routes.on(["POST", "GET", "PATCH"], "/schema", async ctx => {
    const method = ctx.req.method

    switch (method) {
        case "POST": {
            const newSchema = await createBlankConfig()
            return ctx.json(newSchema)
        }
        case "GET": {
            const schema = await getConfig()
            return ctx.json(schema)
        }
        case "PATCH": {
            const body = await ctx.req.json()
            // should be HTTP POST in the future?
            const updatedSchema = await createField(body)
            return ctx.json(updatedSchema)
        }
    }
})

routes.patch("/schema/:id", async ctx => {
    return ctx.json({ msg: "ok" })
})

export default routes
