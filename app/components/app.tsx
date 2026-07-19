import { useQuery } from '@tanstack/react-query'
import { getEntries } from '@/apis/entries'
import { DataTable } from '@/components/data-table'
import { entryHandler } from '@/components/dialog-handlers'
import { columns } from '@/components/entries/columns'
import EntryFormDialog from '@/components/entries/dialog'
import { Button } from '@/components/ui/button'
import { entriesKeys } from '@/query-keys'
import type { Entry } from '@/types'
import DialogConfirmation from './entries/dialog-confirmation'

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
            <EntryFormDialog />
            <nav className="border py-2">
                <div className="container mx-auto px-5">
                    <div className="w-full flex flex-row items-center justify-between">
                        <span></span>
                        <div>
                            <Button
                                onClick={() =>
                                    entryHandler.openWithPayload({
                                        type: 'create'
                                    })
                                }
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
                        <DialogConfirmation />
                        <DataTable data={data} columns={columns} />
                    </div>
                </div>
            </div>
        </>
    )
}
