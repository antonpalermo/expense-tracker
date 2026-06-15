import {
    flexRender,
    useReactTable,
    getCoreRowModel,
    createColumnHelper
} from "@tanstack/react-table"
import type { SelectEntry } from "../types"

const columnHelper = createColumnHelper<SelectEntry>()

const parseDate = (input: Date) => {
    const date = new Date(input)
    return Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium"
    }).format(date)
}

const columns = [
    columnHelper.accessor("name", {
        header: () => <span>Name</span>
    }),
    columnHelper.accessor("description", {
        header: () => <span>Description</span>
    }),
    columnHelper.accessor("amount", {
        header: () => <span>Amount</span>
    }),
    columnHelper.accessor("createdAt", {
        header: () => <span>Date Created</span>,
        cell: ({ row }) => {
            const date = parseDate(row.original.createdAt)
            return <span>{date}</span>
        }
    })
]

export default function DataTable({ data }: { data: SelectEntry[] }) {
    "use no memo"

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel()
    })

    return (
        <div>
            <h2>Entries</h2>
            <table>
                <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <th key={header.id}>
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                              header.column.columnDef.header,
                                              header.getContext()
                                          )}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table.getRowModel().rows.map(row => (
                        <tr key={row.id}>
                            {row.getVisibleCells().map(cell => (
                                <td key={cell.id}>
                                    {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
