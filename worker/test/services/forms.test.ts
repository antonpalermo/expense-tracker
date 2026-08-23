import { describe, expect, test } from 'vitest'
import { createBlankFields, formConfigKey } from '@/services/forms'

describe('createBlankFields', () => {
    test('returns Name, Description and Amount', () => {
        const fields = createBlankFields()

        expect(fields.map(field => field.name)).toEqual([
            'Name',
            'Description',
            'Amount'
        ])
    })

    test('Name and Description are text fields, Amount is numeric', () => {
        const [name, description, amount] = createBlankFields()

        expect(name?.type).toBe('text')
        expect(name?.default).toBe('')
        expect(description?.type).toBe('text')
        expect(description?.default).toBe('')
        expect(amount?.type).toBe('number')
        expect(amount?.default).toBe(0)
    })

    test('every field gets a unique uid', () => {
        const uids = createBlankFields().map(field => field.uid)

        expect(new Set(uids).size).toBe(uids.length)
    })
})

describe('formConfigKey', () => {
    test('namespaces the key by ledger id', () => {
        expect(formConfigKey('abc123')).toBe('ledger:abc123:form_schema')
    })
})
