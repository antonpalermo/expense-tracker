import { useQuery } from "@tanstack/react-query"

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
    } = useQuery({
        queryKey: ["FORM_SCHEMA"],
        queryFn: getSchema
    })

    if (isError) {
        throw new Error("unable to get form schema")
    }

    return (
        <div>
            <h1>Dynamic Form</h1>
            {!isPending && JSON.stringify(schema)}
        </div>
    )
}
