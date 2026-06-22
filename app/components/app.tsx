import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { columns } from "@/components/entries/columns"
import { DataTable } from "@/components/data-table"
import { entryDialogHandler } from "@/components/dialog-handlers"

import { entriesKeys } from "@/query-keys"
import { getEntries } from "@/apis/entries"
import type { Entry } from "@/types"

import EntryForm from "@/components/entries/form"
import EntryDialog from "@/components/entries/dialog"

export default function App() {
    const { data, isError, isPending } = useQuery<Entry[]>({
        queryKey: [entriesKeys.all],
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
                <div className="container mx-auto px-5">
                    <div className="w-full flex flex-row items-center justify-between">
                        <span></span>
                        <div>
                            <Button
                                onClick={() => entryDialogHandler.open(null)}
                            >
                                Create
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>
            <div className="container mx-auto px-5">
                <div className="py-5">
                    <div className="space-y-5">
                        <h2 className="text-2xl font-bold">Expenses</h2>
                        <EntryDialog
                            header={{
                                title: "Create new entry",
                                description: "Creates a new entry"
                            }}
                            handler={entryDialogHandler}
                        >
                            <EntryForm />
                        </EntryDialog>
                        <DataTable data={data} columns={columns} />
                    </div>
                </div>
            </div>
        </>
    )
}
