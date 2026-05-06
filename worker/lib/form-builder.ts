import { set } from "@/lib/cache"

type Field = {
    uid: string
    type: "text" | "number"
    name: string
}

export const FIELD_KEY = "user:form_schema"

export const DEFAULT_FEILDS: Field[] = [
    {
        uid: crypto.randomUUID(),
        name: "Description",
        type: "text"
    },
    {
        uid: crypto.randomUUID(),
        name: "Amount",
        type: "number"
    }
]

export async function createFields() {
    await set<Field[]>(FIELD_KEY, DEFAULT_FEILDS, {
        expirationTtl: 60 * 60 * 24 * 7
    })

    return DEFAULT_FEILDS
}
