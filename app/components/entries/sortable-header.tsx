import type { Column } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Entry } from '@/types'

export default function SortableHeader({
    column,
    label
}: {
    column: Column<Entry, unknown>
    label: string
}) {
    const sorted = column.getIsSorted()

    return (
        <Button
            variant="ghost"
            size="sm"
            className="-ml-2.5"
            onClick={column.getToggleSortingHandler()}
        >
            {label}
            {sorted === 'asc' ? (
                <ArrowUp className="size-3.5" />
            ) : sorted === 'desc' ? (
                <ArrowDown className="size-3.5" />
            ) : (
                <ChevronsUpDown className="size-3.5" />
            )}
        </Button>
    )
}
