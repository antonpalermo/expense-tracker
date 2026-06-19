import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { columns } from "@/components/entries/columns"
import { DataTable } from "@/components/data-table"

import { entriesKeys } from "@/query-keys"
import type { Entry } from "@/types"

import { getEntries } from "@/apis/entries"

export default function App() {
    const { data, isError, isPending } = useQuery<Entry[]>({
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
        <>
            <nav className="border py-2">
                <div className="container mx-auto">
                    <div className="w-full flex flex-row items-center justify-between">
                        <h1 className="font-medium">Expense Tracker</h1>
                        <div>
                            <Button>Create</Button>
                        </div>
                    </div>
                </div>
            </nav>
            <div className="container mx-auto">
                <div className="py-5">
                    <div className="space-y-5">
                        <h2>Expenses</h2>
                        <DataTable data={data} columns={columns} />
                    </div>
                </div>
            </div>
        </>
    )
}
