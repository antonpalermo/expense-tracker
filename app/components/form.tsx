import * as React from "react"
// import { useQuery } from "@tanstack/react-query"

export default function DynamicForm() {
    const [schema, setSchema] = React.useState({})

    React.useEffect(() => {
        const getSchema = async () => {
            const request = await fetch("/api/forms/schema")
            if (!request) {
                throw new Error("unable to fetch form schema")
            }
            const data = await request.json()
            setSchema(data)
        }

        getSchema()
    }, [])

    return (
        <div>
            <h1>Dynamic Form</h1>
            {JSON.stringify(schema)}
        </div>
    )
}
