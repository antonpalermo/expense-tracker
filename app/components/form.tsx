import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAppForm } from "../hooks/form"

import type { FormSchema } from "../../worker/bindings"
import { getFormSchema } from "../apis/form-schema"
import { entriesKeys, formSchemaKeys } from "../query-keys"
import { createEntry } from "../apis/entries"

export default function DynamicForm() {
    const client = useQueryClient()

    const { data, isError, isPending } = useQuery<FormSchema>({
        queryKey: formSchemaKeys.all,
        queryFn: getFormSchema
    })

    const createTaskMutation = useMutation({
        mutationFn: createEntry,
        onSuccess: () => {
            client.invalidateQueries({
                queryKey: entriesKeys.all
            })
        }
    })

    const form = useAppForm({
        defaultValues: !isPending ? data?.schema : {},
        onSubmit: async ({ value }) => {
            await createTaskMutation.mutateAsync(value)
        }
    })

    if (isPending) {
        return <div>loading....</div>
    }

    if (isError) {
        throw new Error("unable to get form schema")
    }

    return (
        <div>
            <h1>Dynamic Form</h1>
            <form
                onSubmit={e => {
                    e.preventDefault()
                    form.handleSubmit()
                }}
            >
                {data.fields.map(field => (
                    <form.Field
                        key={field.uid}
                        name={field.uid}
                        children={({ state, handleChange, handleBlur }) => (
                            <div>
                                <label htmlFor={field.uid}>{field.name}</label>
                                <input
                                    id={field.uid}
                                    name={field.uid}
                                    value={state.value as undefined}
                                    onBlur={handleBlur}
                                    onChange={e => handleChange(e.target.value)}
                                />
                            </div>
                        )}
                    />
                ))}
                <form.Subscribe>
                    <button type="submit">send</button>
                </form.Subscribe>
            </form>
        </div>
    )
}
