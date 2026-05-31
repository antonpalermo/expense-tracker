import * as React from "react"
import {
    flexRender,
    getCoreRowModel,
    useReactTable
} from "@tanstack/react-table"

export default function DataTable({
    data
}: {
    data: Record<string, unknown>[]
}) {
    "use no memo"

    const columns = React.useMemo(() => {
        if (!data || data.length === 0) return []

        const columnShape = Object.keys(data[data.length - 1])

        return columnShape.map(key => ({
            accessorKey: key,
            header: key.charAt(0).toUpperCase() + key.slice(1),
            cell: (info: { getValue: () => void }) => {
                const value = info.getValue()
                if (typeof value === "object" && value !== null) {
                    return JSON.stringify(value)
                }
                return value !== null && value !== undefined
                    ? String(value)
                    : "-"
            }
        }))
    }, [data])

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
