import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { createLedger, updateLedger } from '@/apis/ledgers'
import { ledgerHandler } from '@/components/dialog-handlers'
import { Button } from '@/components/ui/button'
import { DialogClose, DialogFooter } from '@/components/ui/dialog'
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAppForm } from '@/hooks/form'
import { ledgersKeys } from '@/query-keys'
import type { LedgerPayload } from '@/types'

const schema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(80),
    description: z.string().trim().max(500).nullish()
})

export type LedgerFormProps =
    | { type: 'create' }
    | { type: 'edit'; id: string; resetData: LedgerPayload }

export default function LedgerForm(props: LedgerFormProps) {
    const queryClient = useQueryClient()

    const invalidate = async () => {
        await queryClient.invalidateQueries({ queryKey: ledgersKeys.all })
    }

    const createMutation = useMutation({
        mutationFn: createLedger,
        onSuccess: invalidate
    })

    const updateMutation = useMutation({
        mutationFn: (value: LedgerPayload) =>
            updateLedger(props.type === 'edit' ? props.id : '', value),
        onSuccess: async () => {
            await invalidate()
            if (props.type === 'edit') {
                await queryClient.invalidateQueries({
                    queryKey: ledgersKeys.detail(props.id)
                })
            }
        }
    })

    const form = useAppForm({
        defaultValues:
            props.type === 'edit'
                ? props.resetData
                : ({ name: '', description: '' } as LedgerPayload),
        validators: { onSubmit: schema },
        onSubmit: async ({ value }) => {
            const mutation =
                props.type === 'create' ? createMutation : updateMutation

            toast.promise(mutation.mutateAsync(value), {
                loading: props.type === 'create' ? 'Creating...' : 'Saving...',
                success: data => {
                    ledgerHandler.close()
                    return props.type === 'create'
                        ? `${data.name} created`
                        : `${data.name} updated`
                },
                error: error => (error as Error).message
            })
        }
    })

    return (
        <form
            onSubmit={e => {
                e.preventDefault()
                form.handleSubmit()
            }}
        >
            <FieldGroup>
                <form.Field name="name">
                    {field => {
                        const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid

                        return (
                            <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={field.name}>
                                    Name
                                </FieldLabel>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value ?? ''}
                                    onBlur={field.handleBlur}
                                    onChange={e =>
                                        field.handleChange(
                                            e.currentTarget.value
                                        )
                                    }
                                    aria-invalid={isInvalid}
                                    placeholder="Household"
                                    autoComplete="off"
                                />
                                {isInvalid && (
                                    <FieldError
                                        errors={field.state.meta.errors}
                                    />
                                )}
                            </Field>
                        )
                    }}
                </form.Field>
                <form.Field name="description">
                    {field => (
                        <Field>
                            <FieldLabel htmlFor={field.name}>
                                Description
                            </FieldLabel>
                            <Textarea
                                id={field.name}
                                name={field.name}
                                value={field.state.value ?? ''}
                                onBlur={field.handleBlur}
                                onChange={e =>
                                    field.handleChange(e.currentTarget.value)
                                }
                                placeholder="Shared household expenses"
                                autoComplete="off"
                            />
                        </Field>
                    )}
                </form.Field>
                <Field orientation="horizontal">
                    <DialogFooter className="w-full">
                        <DialogClose
                            render={<Button variant="ghost">Cancel</Button>}
                        />
                        <Button type="submit">
                            {props.type === 'create' ? 'Create' : 'Save'}
                        </Button>
                    </DialogFooter>
                </Field>
            </FieldGroup>
        </form>
    )
}
