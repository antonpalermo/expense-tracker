import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAppForm } from "../hooks/form"

import type { FormSchema } from "../../worker/bindings"

export default function DynamicForm() {
    const client = useQueryClient()
    const getSchema = async () => {
        const request = await fetch("/api/forms/schema")
        if (!request) {
            throw new Error("unable to fetch form schema")
        }
        return await request.json()
    }

    const createTask = async (value: unknown) => {
        const data = {
            formId: "jTIgiBp1Jz74oKtnJxNo",
            data: value
        }
        const request = await fetch("/api/entries", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        })

        if (!request) {
            throw new Error("unable to create tasks")
        }

        return await request.json()
    }

    const { data, isError, isPending } = useQuery<FormSchema>({
        queryKey: ["FORM_SCHEMA"],
        queryFn: getSchema
    })

    const createTaskMutation = useMutation({
        mutationFn: createTask,
        onSuccess: () => {
            client.invalidateQueries({
                queryKey: ["entries"]
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
