import { describe, expect, test } from 'vitest'
import { entryTypeFor } from '@/database/schemas'

describe('entryTypeFor', () => {
    test('a negative amount is a debit', () => {
        expect(entryTypeFor(-0.01)).toBe('debit')
        expect(entryTypeFor(-1000)).toBe('debit')
    })

    test('zero and above is a credit', () => {
        expect(entryTypeFor(0)).toBe('credit')
        expect(entryTypeFor(0.01)).toBe('credit')
        expect(entryTypeFor(1000)).toBe('credit')
    })
})
