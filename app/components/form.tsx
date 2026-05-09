import { useQuery } from "@tanstack/react-query"
import { useAppForm } from "../hooks/form"

type Field = {
    id: string
    name: string
    type: string
}

type FormResponse = {
    schema: { [key: string]: unknown }
    fields: Field[]
}

export default function DynamicForm() {
    const getSchema = async () => {
        const request = await fetch("/api/forms/schema")
        if (!request) {
            throw new Error("unable to fetch form schema")
        }
        return await request.json()
    }

    const { data, isError, isPending } = useQuery<FormResponse>({
        queryKey: ["FORM_SCHEMA"],
        queryFn: getSchema
    })
    const form = useAppForm({
        defaultValues: !isPending && data?.schema,
        onSubmit: async ({ value }) => {
            console.log(value)
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
                        key={field.id}
                        name={field.id}
                        children={({ state, handleChange, handleBlur }) => (
                            <div>
                                <label htmlFor={field.id}>{field.name}</label>
                                <input
                                    name={field.id}
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
