export type FieldType = {
    text: string
    number: number
}

export type Field = {
    [K in keyof FieldType]: {
        uid: string
        name: string
        type: K
        default: FieldType[K]
    }
}[keyof FieldType]

export type FormSchema = {
    schema: { [key: string]: unknown }
    fields: Field[]
}
