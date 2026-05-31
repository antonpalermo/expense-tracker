import { useQuery } from "@tanstack/react-query"
import DynamicForm from "./form"
import DataTable from "./data-table"

import { getEntries } from "../apis/entries"
import { entriesKeys } from "../query-keys"

type DynamicData = Record<string, unknown>

export default function Entries() {
    const { data, isError, isPending } = useQuery<DynamicData[]>({
        queryKey: entriesKeys.all,
        queryFn: getEntries
    })

    if (isError) {
        return <span>Error</span>
    }

    if (isPending || (data === undefined && !isError)) {
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
