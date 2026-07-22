import { createFormHook, createFormHookContexts } from '@tanstack/react-form'
import {
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSeparator,
    FieldSet,
    FieldTitle,
    Field as MainField
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export const { fieldContext, formContext, useFieldContext, useFormContext } =
    createFormHookContexts()

export const { useAppForm } = createFormHook({
    fieldComponents: {
        Input,
        FieldSet,
        FieldGroup,
        FieldLabel,
        FieldTitle,
        FieldError,
        FieldLegend,
        FieldContent,
        FieldSeparator,
        FieldDescription,
        MainField
    },
    formComponents: {},
    fieldContext,
    formContext
})
