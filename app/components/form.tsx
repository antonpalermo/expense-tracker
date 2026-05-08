import { useQuery } from "@tanstack/react-query"
import { useAppForm } from "../hooks/form"
import Input from "./input"

export default function DynamicForm() {
    const getSchema = async () => {
        const request = await fetch("/api/forms/schema")
        if (!request) {
            throw new Error("unable to fetch form schema")
        }
        return await request.json()
    }

    const {
        data: schema,
        isError,
        isPending
    } = useQuery<{ fields: { uid: string; name: string; type: string }[] }>({
        queryKey: ["FORM_SCHEMA"],
        queryFn: getSchema
    })
    const form = useAppForm({
        onSubmit: async ({ value }) => {
            console.log(value)
        }
    })

    if (isPending) {
        return null
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
                <pre>
                    {schema.fields.map(field => JSON.stringify(field, null, 2))}
                </pre>
                {schema.fields.map(field => (
                    <form.Field
                        key={field.uid}
                        name={field.name}
                        children={({ state, handleChange, handleBlur }) => (
                            <div>
                                <label htmlFor={field.uid}>{field.name}</label>
                                <input
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
