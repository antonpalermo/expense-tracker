import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DialogClose, DialogFooter } from "@/components/ui/dialog"
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel
} from "@/components/ui/field"

import type { EntryPayload as Entry } from "@/types"
import { useAppForm } from "@/hooks/form"

const defaults: Entry = {
    name: "",
    description: "",
    amount: 0
}

export default function EntryForm() {
    const form = useAppForm({
        defaultValues: defaults,
        onSubmit: async ({ value }) => {
            console.log(value)
        }
    })

    return (
        <form
            onSubmit={e => {
                e.preventDefault()
                e.stopPropagation()
                form.handleSubmit()
            }}
        >
            <FieldGroup>
                <form.Field
                    name="name"
                    children={({ name, state, handleBlur, handleChange }) => {
                        const isInvalid =
                            state.meta.isTouched && !state.meta.isValid

                        return (
                            <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={name}>Name</FieldLabel>
                                <Input
                                    id={name}
                                    name={name}
                                    value={state.value}
                                    onBlur={handleBlur}
                                    onChange={e =>
                                        handleChange(e.currentTarget.value)
                                    }
                                    aria-invalid={isInvalid}
                                    placeholder="Banana"
                                    autoComplete="off"
                                    type="text"
                                />
                                {isInvalid && (
                                    <FieldError errors={state.meta.errors} />
                                )}
                            </Field>
                        )
                    }}
                />
                <form.Field
                    name="description"
                    children={({ name, state, handleBlur, handleChange }) => {
                        const isInvalid =
                            state.meta.isTouched && !state.meta.isValid

                        return (
                            <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={name}>
                                    Description
                                </FieldLabel>
                                <Textarea
                                    id={name}
                                    name={name}
                                    value={state.value}
                                    onBlur={handleBlur}
                                    onChange={e =>
                                        handleChange(e.currentTarget.value)
                                    }
                                    aria-invalid={isInvalid}
                                    placeholder="Protien requirements"
                                    autoComplete="off"
                                />
                                {isInvalid && (
                                    <FieldError errors={state.meta.errors} />
                                )}
                            </Field>
                        )
                    }}
                />
                <form.Field
                    name="amount"
                    children={({ name, state, handleBlur, handleChange }) => {
                        const isInvalid =
                            state.meta.isTouched && !state.meta.isValid

                        return (
                            <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={name}>Amount</FieldLabel>
                                <Input
                                    id={name}
                                    name={name}
                                    value={state.value}
                                    onBlur={handleBlur}
                                    onChange={e =>
                                        handleChange(
                                            e.currentTarget.valueAsNumber
                                        )
                                    }
                                    aria-invalid={isInvalid}
                                    placeholder="0.00"
                                    autoComplete="off"
                                    type="number"
                                />
                                {isInvalid && (
                                    <FieldError errors={state.meta.errors} />
                                )}
                            </Field>
                        )
                    }}
                />
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
