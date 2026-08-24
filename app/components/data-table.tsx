import type {
    ColumnDef,
    OnChangeFn,
    PaginationState,
    SortingState
} from '@tanstack/react-table'
import {
    flexRender,
    getCoreRowModel,
    useReactTable
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'

export type DataTableProps<T extends Record<string, unknown>> = {
    data: T[]
    columns: ColumnDef<T, unknown>[]
    sorting?: SortingState
    onSortingChange?: OnChangeFn<SortingState>
    pagination?: PaginationState
    pageCount?: number
    onPageChange?: (pageIndex: number) => void
}

export function DataTable<T extends Record<string, unknown>>({
    data,
    columns,
    sorting,
    onSortingChange,
    pagination,
    pageCount,
    onPageChange
}: DataTableProps<T>) {
    'use no memo'

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualSorting: sorting !== undefined,
        manualPagination: pagination !== undefined,
        pageCount: pagination !== undefined ? (pageCount ?? -1) : undefined,
        state: {
            ...(sorting !== undefined && { sorting }),
            ...(pagination !== undefined && { pagination })
        },
        onSortingChange
    })

    const contents = table.getRowModel().rows.map(row => (
        <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
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
        <div className="space-y-3">
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

            {pagination && onPageChange && (
                <div className="flex items-center justify-end gap-2">
                    <span className="text-muted-foreground text-sm">
                        Page {pagination.pageIndex + 1} of{' '}
                        {Math.max(pageCount ?? 1, 1)}
                    </span>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        disabled={pagination.pageIndex === 0}
                        onClick={() => onPageChange(pagination.pageIndex - 1)}
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        disabled={
                            pageCount === undefined ||
                            pagination.pageIndex >= pageCount - 1
                        }
                        onClick={() => onPageChange(pagination.pageIndex + 1)}
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            )}
        </div>
    )
}
