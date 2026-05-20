import { useQuery } from "@tanstack/react-query"
import DynamicForm from "./form"
import DataTable from "./data-table"

const getEntries = async () => {
    const request = await fetch("/api/entries/jTIgiBp1Jz74oKtnJxNo")
    if (!request.ok) {
        throw new Error("unable to fetch all entries")
    }
    return await request.json()
}

export default function Entries() {
    const { data, isError, isPending } = useQuery({
        queryKey: ["entries"],
        queryFn: getEntries
    })

    if (isError) {
        return <span>Error</span>
    }

    if (isPending) {
        return <span>loading</span>
    }

    return (
        <div>
            <h1>Application Entries</h1>
            <DynamicForm />
            <DataTable data={data} />
        </div>
    )
}
