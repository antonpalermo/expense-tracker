import { createFormHook, createFormHookContexts } from "@tanstack/react-form"
import { Input } from "@/components/ui/input"
import {
    FieldSet,
    FieldGroup,
    FieldLabel,
    FieldTitle,
    FieldError,
    FieldLegend,
    FieldContent,
    FieldSeparator,
    FieldDescription,
    Field as MainField
} from "@/components/ui/field"

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
