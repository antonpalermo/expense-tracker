import { describe, expect, test } from 'vitest'
import { normalizeEmail } from './invitations'

describe('normalizeEmail', () => {
    test('trims whitespace', () => {
        expect(normalizeEmail('  a@example.com  ')).toBe('a@example.com')
    })

    test('lowercases the address', () => {
        expect(normalizeEmail('A@Example.COM')).toBe('a@example.com')
    })

    test('trims and lowercases together', () => {
        expect(normalizeEmail('  Foo.Bar@Example.COM  ')).toBe(
            'foo.bar@example.com'
        )
    })
})
