import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { DialogClose, DialogFooter } from "@/components/ui/dialog"
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel
} from "@/components/ui/field"
import { createEntryHandler } from "@/components/dialog-handlers"
import {
    entryFormFields,
    type EntryFormFieldConfig
} from "@/components/entries/form-fields"

import type { EntryPayload as Entry } from "@/types"
import { useAppForm } from "@/hooks/form"
import { createEntry } from "@/apis/entries"
import { entriesKeys } from "@/query-keys"

const defaults: Entry = {
    name: "",
    description: "",
    amount: 0
}

type FieldRenderProps = {
    name: string
    state: {
        meta: {
            isTouched: boolean
            isValid: boolean
            errors: Array<{ message?: string } | undefined>
        }
        value: string | number
    }
    handleBlur: () => void
    handleChange: (
        value: string | number | ((prev: string | number) => string | number)
    ) => void
}

export default function EntryForm() {
    const queryClient = useQueryClient()

    const createEntryMutation = useMutation({
        mutationFn: createEntry,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: [entriesKeys.all] })
        }
    })

    const form = useAppForm({
        defaultValues: defaults,
        onSubmit: async ({ value }) => {
            toast.promise(createEntryMutation.mutateAsync(value), {
                loading: "Creating...",
                success: (data: Entry) => {
                    createEntryHandler.close()
                    return `${data.name} created!`
                },
                error: "Error creating " + value.name
            })
        }
    })

    const FormField = ({
        name,
        label,
        renderControl
    }: EntryFormFieldConfig) => (
        <form.Field
            name={name}
            children={(field: FieldRenderProps) => {
                const {
                    name: fieldName,
                    state,
                    handleBlur,
                    handleChange
                } = field
                const isInvalid = state.meta.isTouched && !state.meta.isValid

                return (
                    <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={fieldName}>{label}</FieldLabel>
                        {renderControl({
                            name: fieldName,
                            value: state.value as string | number,
                            handleBlur,
                            handleChange,
                            isInvalid
                        })}
                        {isInvalid && <FieldError errors={state.meta.errors} />}
                    </Field>
                )
            }}
        />
    )

    const fields = entryFormFields

    return (
        <form
            onSubmit={e => {
                e.preventDefault()
                form.handleSubmit()
            }}
        >
            <FieldGroup>
                {fields.map(field => (
                    <FormField key={field.name} {...field} />
                ))}
                <Field orientation={"horizontal"}>
                    <DialogFooter className="w-full">
                        <DialogClose
                            render={<Button variant="ghost">Cancel</Button>}
                        />
                        <Button type="submit">Create</Button>
                    </DialogFooter>
                </Field>
            </FieldGroup>
        </form>
    )
}
