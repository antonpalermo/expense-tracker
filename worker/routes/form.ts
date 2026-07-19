import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import type { Field, FormSchema } from '@/bindings'
import { db } from '@/database/db'
import { formTable } from '@/database/schemas'
import { get, set } from '@/lib/cache'
import nanoid from '@/lib/nanoid'
import type { HonoBindings } from '../index'

const routes = new Hono<HonoBindings>({ strict: false }).basePath('/forms')

export const FORM_CONFIG_KEY = 'user:form_schema'

function buildSchema(fields: Field[]): FormSchema {
    const fieldDetails = fields.map(field => [field.uid, field.default])
    return { schema: Object.fromEntries(fieldDetails), fields }
}

// set the form config in cache for 24 hours
async function setFormSchema<T>(value: T) {
    await set<T>(FORM_CONFIG_KEY, value, {
        expirationTtl: 60 * 60 * 24
    })
}

async function createBlankSchema() {
    const blankSchema: Field[] = [
        {
            uid: nanoid(),
            name: 'Name',
            type: 'text',
            default: ''
        },
        {
            uid: nanoid(),
            name: 'Description',
            type: 'text',
            default: ''
        },
        {
            uid: nanoid(),
            name: 'Amount',
            type: 'number',
            default: 0
        }
    ]

    try {
        const formSchema = await db
            .insert(formTable)
            .values({ fields: blankSchema })
            .returning()

        // 100% sure that this will contains fields lol
        const fields = formSchema[0].fields!

        const parsedResponse = buildSchema(fields)
        await setFormSchema(parsedResponse)

        return parsedResponse
    } catch (error) {
        throw new Error('app: unable to insert new form schema', {
            cause: error
        })
    }
}

async function getFormDetails(): Promise<FormSchema | null> {
    const cachedSchema = await get<FormSchema>(FORM_CONFIG_KEY)

    if (!cachedSchema) {
        const [formSchema] = await db
            .select({ fields: formTable.fields })
            .from(formTable)
            .limit(1)

        // if no form schema and no cache schema then return undefined
        // meaning there's no schema created yet.
        if (!formSchema) {
            return null
        }

        // if there's a form schema found in db set it in cache
        // for fast subsequent queries.
        const parsedResponse = buildSchema(formSchema.fields!)
        await setFormSchema(parsedResponse)

        return parsedResponse
    }

    return cachedSchema
}

async function createField(field: Omit<Field, 'uid'>) {
    const data = {
        uid: nanoid(),
        ...field
    }

    try {
        const [updatedFields] = await db
            .update(formTable)
            .set({
                fields: sql`json_insert(${formTable.fields}, '$[#]', json(${JSON.stringify(data)}))`
            })
            .returning({
                fields: formTable.fields
            })

        if (!updatedFields.fields) {
            return
        }

        const parsedResponse = buildSchema(updatedFields.fields)
        await setFormSchema(parsedResponse)

        return parsedResponse
    } catch (error) {
        throw new Error('app: insert new field in formSchema configuration', {
            cause: error
        })
    }
}

routes.on(['POST', 'GET', 'PATCH'], '/schema', async ctx => {
    const method = ctx.req.method

    switch (method) {
        case 'POST': {
            const result = await createBlankSchema()
            return ctx.json(result)
        }
        case 'GET': {
            const result = await getFormDetails()

            if (!result) {
                return ctx.notFound()
            }

            return ctx.json(result)
        }
        case 'PATCH': {
            const body = await ctx.req.json()

            const result = await createField(body)
            return ctx.json(result)
        }
    }
})

routes.patch('/schema/:id', async ctx => {
    return ctx.json({ msg: 'ok' })
})

export default routes
