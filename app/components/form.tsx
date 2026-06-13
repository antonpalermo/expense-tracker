import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppForm } from "../hooks/form"
import type { InsertEntry } from "../types"
import { createEntry } from "../apis/entries"
import { entriesKeys } from "../query-keys"

const defaultValues: InsertEntry = {
    name: "",
    description: "",
    amount: 0
}

export default function DynamicForm() {
    const client = useQueryClient()

    const createTaskMutation = useMutation({
        mutationFn: createEntry,
        onSuccess: () => {
            client.invalidateQueries({
                queryKey: entriesKeys.all
            })
        }
    })

    const form = useAppForm({
        defaultValues,
        onSubmit: async ({ value }) => {
            await createTaskMutation.mutateAsync(value)
        }
    })

    return (
        <div>
            <h1>Dynamic Form</h1>
            <form
                onSubmit={e => {
                    e.preventDefault()
                    form.handleSubmit()
                }}
            >
                <form.Field
                    name="name"
                    children={({ state, handleChange, handleBlur }) => (
                        <div>
                            <label htmlFor="name">Name</label>
                            <input
                                id="name"
                                name="name"
                                value={state.value as undefined}
                                onBlur={handleBlur}
                                onChange={e => handleChange(e.target.value)}
                            />
                        </div>
                    )}
                />
                <form.Field
                    name="description"
                    children={({ state, handleChange, handleBlur }) => (
                        <div>
                            <label htmlFor="description">Description</label>
                            <textarea
                                id="description"
                                name="description"
                                value={state.value as undefined}
                                onBlur={handleBlur}
                                onChange={e => handleChange(e.target.value)}
                            />
                        </div>
                    )}
                />
                <form.Field
                    name="amount"
                    children={({ state, handleChange, handleBlur }) => (
                        <div>
                            <label htmlFor="amount">Amount</label>
                            <input
                                id="amount"
                                name="amount"
                                type="number"
                                value={state.value as number}
                                onBlur={handleBlur}
                                onChange={e =>
                                    handleChange(e.target.valueAsNumber)
                                }
                            />
                        </div>
                    )}
                />
                <form.Subscribe>
                    <button type="submit">send</button>
                </form.Subscribe>
            </form>
        </div>
    )
}
