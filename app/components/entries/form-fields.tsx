import type { ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export type EntryFormFieldControlProps = {
    name: string
    value: string | number
    handleBlur: () => void
    handleChange: (
        value: string | number | ((prev: string | number) => string | number)
    ) => void
    isInvalid: boolean
}

export type EntryFormFieldConfig = {
    name: 'name' | 'description' | 'amount'
    label: string
    renderControl: (props: EntryFormFieldControlProps) => ReactNode
}

export const entryFormFields: EntryFormFieldConfig[] = [
    {
        name: 'name',
        label: 'Name',
        renderControl: ({
            name,
            value,
            handleBlur,
            handleChange,
            isInvalid
        }) => (
            <Input
                id={name}
                name={name}
                value={value}
                onBlur={handleBlur}
                onChange={e => handleChange(e.currentTarget.value)}
                aria-invalid={isInvalid}
                placeholder="Banana"
                autoComplete="off"
                type="text"
            />
        )
    },
    {
        name: 'description',
        label: 'Description',
        renderControl: ({
            name,
            value,
            handleBlur,
            handleChange,
            isInvalid
        }) => (
            <Textarea
                id={name}
                name={name}
                value={value}
                onBlur={handleBlur}
                onChange={e => handleChange(e.currentTarget.value)}
                aria-invalid={isInvalid}
                placeholder="Protien requirements"
                autoComplete="off"
            />
        )
    },
    {
        name: 'amount',
        label: 'Amount',
        renderControl: ({
            name,
            value,
            handleBlur,
            handleChange,
            isInvalid
        }) => (
            <Input
                id={name}
                name={name}
                value={value}
                onBlur={handleBlur}
                onChange={e => handleChange(e.currentTarget.valueAsNumber)}
                aria-invalid={isInvalid}
                placeholder="0.00"
                autoComplete="off"
                type="number"
            />
        )
    }
]
