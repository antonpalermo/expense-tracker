import { createFormHook, createFormHookContexts } from "@tanstack/react-form"
import Input from "../components/input"

export const { fieldContext, formContext, useFieldContext, useFormContext } =
    createFormHookContexts()

export const { useAppForm } = createFormHook({
    fieldComponents: {
        Input
    },
    formComponents: {},
    fieldContext,
    formContext
})
