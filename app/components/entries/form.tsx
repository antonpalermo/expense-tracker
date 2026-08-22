import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createEntry, updateEntry } from '@/apis/entries'
import { entryHandler } from '@/components/dialog-handlers'
import {
    type EntryFormFieldConfig,
    entryFormFields
} from '@/components/entries/form-fields'
import { Button } from '@/components/ui/button'
import { DialogClose, DialogFooter } from '@/components/ui/dialog'
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel
} from '@/components/ui/field'
import { useAppForm } from '@/hooks/form'
import { entriesKeys } from '@/query-keys'
import type { Entry, EntryPayload } from '@/types'

const defaults: EntryPayload = {
    name: '',
    description: '',
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

export type EntryFormProps =
    | { type: 'create'; ledgerId: string }
    | {
          type: 'edit'
          ledgerId: string
          id: string
          resetData: EntryPayload
      }

export default function EntryForm(props: EntryFormProps) {
    const { ledgerId } = props
    const queryClient = useQueryClient()

    const invalidate = async () => {
        await queryClient.invalidateQueries({
            queryKey: entriesKeys.byLedger(ledgerId)
        })
    }

    // useMutation takes a single-argument mutationFn, so the ledger id is
    // curried in here rather than threaded through the form values.
    const createEntryMutation = useMutation({
        mutationFn: (value: EntryPayload) => createEntry(ledgerId, value),
        onSuccess: invalidate
    })

    const updateEntryMutation = useMutation({
        mutationFn: (value: Partial<EntryPayload>) =>
            updateEntry(ledgerId, props.type === 'edit' ? props.id : '', value),
        onSuccess: invalidate
    })

    const form = useAppForm({
        defaultValues: props.type === 'edit' ? props.resetData : defaults,
        onSubmit: async ({ value }) => {
            const mutation =
                props.type === 'create'
                    ? createEntryMutation
                    : updateEntryMutation

            toast.promise(mutation.mutateAsync(value), {
                loading:
                    props.type === 'create' ? 'Creating...' : 'Updating...',
                success: (data: Entry) => {
                    entryHandler.close()
                    return props.type === 'create'
                        ? `${data.name} created!`
                        : `${data.name} updated!`
                },
                error: error => (error as Error).message
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

    return (
        <form
            onSubmit={e => {
                e.preventDefault()
                form.handleSubmit()
            }}
        >
            <FieldGroup>
                {entryFormFields.map(field => (
                    <FormField key={field.name} {...field} />
                ))}
                <Field orientation={'horizontal'}>
                    <DialogFooter className="w-full">
                        <DialogClose
                            render={<Button variant="ghost">Cancel</Button>}
                        />
                        <Button type="submit">
                            {props.type === 'create' ? 'Create' : 'Update'}
                        </Button>
                    </DialogFooter>
                </Field>
            </FieldGroup>
        </form>
    )
}
