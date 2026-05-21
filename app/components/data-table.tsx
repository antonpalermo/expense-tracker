import {
    flexRender,
    getCoreRowModel,
    useReactTable
} from "@tanstack/react-table"
import * as React from "react"

export default function DataTable({ data }: { data: unknown[] }) {
    const columns = React.useMemo(() => {
        if (!data.length) return []

        const keys = Object.keys(data[0])

        return keys.map(key => ({
            accessorKey: key,
            header: key.toUpperCase(),
            cell: (info: unknown) => {
                const value = info.getValue()

                if (typeof value === "object") {
                    return JSON.stringify(value)
                }

                return value?.toString()
            }
        }))
    }, [data])

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
