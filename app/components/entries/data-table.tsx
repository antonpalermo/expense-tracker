import type { ColumnDef } from "@tanstack/react-table"
import {
    flexRender,
    getCoreRowModel,
    useReactTable
} from "@tanstack/react-table"
import {
    Table,
    TableRow,
    TableBody,
    TableCell,
    TableHead,
    TableHeader
} from "@/components/ui/table"

export type DataTableProps<T extends Record<string, unknown>> = {
    data: T[]
    columns: ColumnDef<T>[]
}

export function DataTable<T extends Record<string, unknown>>({
    data,
    columns
}: DataTableProps<T>) {
    "use no memo"

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel()
    })

    const contents = table.getRowModel().rows.map(row => (
        <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
            {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
            ))}
        </TableRow>
    ))

    const contentNotFound = (
        <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
            </TableCell>
        </TableRow>
    )

    const header = table.getHeaderGroups().map(group => (
        <TableRow key={group.id}>
            {group.headers.map(heading => (
                <TableHead key={heading.id}>
                    {heading.isPlaceholder
                        ? null
                        : flexRender(
                              heading.column.columnDef.header,
                              heading.getContext()
                          )}
                </TableHead>
            ))}
        </TableRow>
    ))

    return (
        <div className="overflow-hidden rounded-md border">
            <Table>
                <TableHeader>{header}</TableHeader>
                <TableBody>
                    {table.getRowModel().rows.length
                        ? contents
                        : contentNotFound}
                </TableBody>
            </Table>
        </div>
    )
}
