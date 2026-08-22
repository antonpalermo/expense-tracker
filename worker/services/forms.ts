import { eq, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import type { Field, FormSchema } from '@/bindings'
import { db } from '@/database/db'
import { formTable } from '@/database/schemas'
import { get, set } from '@/lib/cache'
import nanoid from '@/lib/nanoid'
import * as HTTPStatus from '@/status-codes'

export const formConfigKey = (ledgerId: string) =>
    `ledger:${ledgerId}:form_schema`

export function createBlankFields(): Field[] {
    return [
        { uid: nanoid(), name: 'Name', type: 'text', default: '' },
        { uid: nanoid(), name: 'Description', type: 'text', default: '' },
        { uid: nanoid(), name: 'Amount', type: 'number', default: 0 }
    ]
}

function buildSchema(fields: Field[]): FormSchema {
    const fieldDetails = fields.map(field => [field.uid, field.default])
    return { schema: Object.fromEntries(fieldDetails), fields }
}

// Write-through: every mutation refreshes the cache immediately, so KV and D1
// never disagree.
async function setFormSchema(ledgerId: string, value: FormSchema) {
    await set<FormSchema>(formConfigKey(ledgerId), value, {
        expirationTtl: 60 * 60 * 24
    })
}

export async function getFormDetails(ledgerId: string): Promise<FormSchema> {
    const cached = await get<FormSchema>(formConfigKey(ledgerId))

    if (cached) {
        return cached
    }

    let form: { fields: Field[] | null } | undefined

    try {
        ;[form] = await db
            .select({ fields: formTable.fields })
            .from(formTable)
            .where(eq(formTable.ledgerId, ledgerId))
            .limit(1)
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to fetch the form schema'
        })
    }

    // The form row is created in the same batch as the ledger, so a missing row
    // is a genuine 404 rather than a not-yet-bootstrapped state.
    if (!form?.fields) {
        throw new HTTPException(HTTPStatus.NOT_FOUND, {
            message: 'form schema not found'
        })
    }

    const parsed = buildSchema(form.fields)
    await setFormSchema(ledgerId, parsed)

    return parsed
}

export async function createField(ledgerId: string, field: Omit<Field, 'uid'>) {
    const data = { uid: nanoid(), ...field }

    let updated: { fields: Field[] | null } | undefined

    try {
        // The `.where` is load-bearing: without it this rewrites every ledger's
        // schema, and the cache would then serve another ledger's fields.
        ;[updated] = await db
            .update(formTable)
            .set({
                fields: sql`json_insert(${formTable.fields}, '$[#]', json(${JSON.stringify(data)}))`
            })
            .where(eq(formTable.ledgerId, ledgerId))
            .returning({ fields: formTable.fields })
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to add a field to the form schema'
        })
    }

    if (!updated?.fields) {
        throw new HTTPException(HTTPStatus.NOT_FOUND, {
            message: 'form schema not found'
        })
    }

    const parsed = buildSchema(updated.fields)
    await setFormSchema(ledgerId, parsed)

    return parsed
}
