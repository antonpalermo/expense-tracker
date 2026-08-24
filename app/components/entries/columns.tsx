import type { ColumnDef } from '@tanstack/react-table'
import { createColumnHelper } from '@tanstack/react-table'
import type { LedgerRole } from '@/lib/roles'
import { hasRole } from '@/lib/roles'
import type { EntriesSort, Entry } from '@/types'

import AuthorAvatar from './author-avatar'
import SortableHeader from './sortable-header'
import TableActions from './table-actions'
import EntryTypeBadge from './type-badge'

const columnHelper = createColumnHelper<Entry>()

// The table only understands react-table column ids; these two maps keep
// that id in sync with the `sort` search param the worker's query schema
// accepts (see worker/database/schemas/entries.ts's ENTRIES_SORT_FIELDS).
export const SORT_COLUMN_IDS: Record<EntriesSort, string> = {
    date: 'createdAt',
    amount: 'amount',
    name: 'name'
}

export const SORT_FIELDS_BY_COLUMN_ID: Record<string, EntriesSort> = {
    createdAt: 'date',
    amount: 'amount',
    name: 'name'
}

// The sign of `amount` now carries meaning (it is what `type` derives from),
// so a raw `-250` beside a red badge reads as a rendering bug.
const currency = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
})

const parseDate = (input: Date) => {
    const date = new Date(input)
    return Intl.DateTimeFormat('en-PH', {
        dateStyle: 'medium'
    }).format(date)
}

// A function rather than a constant so the row menu can be dropped entirely for
// viewers. DataTable takes columns as a prop and is marked 'use no memo', so
// rebuilding per render matches what the table already does.
export function createColumns(ledgerId: string, role: LedgerRole) {
    const columns = [
        columnHelper.accessor('name', {
            header: ({ column }) => (
                <SortableHeader column={column} label="Name" />
            )
        }),
        columnHelper.accessor('description', {
            header: 'Description',
            cell: ({ row }) => <span>{row.original.description ?? '—'}</span>
        }),
        columnHelper.accessor('amount', {
            header: ({ column }) => (
                <SortableHeader column={column} label="Amount" />
            ),
            cell: ({ row }) => (
                <span>{currency.format(row.original.amount)}</span>
            )
        }),
        columnHelper.accessor('type', {
            header: 'Type',
            cell: ({ row }) => <EntryTypeBadge type={row.original.type} />
        }),
        columnHelper.accessor('createdAt', {
            header: ({ column }) => (
                <SortableHeader column={column} label="Date Created" />
            ),
            cell: ({ row }) => <span>{parseDate(row.original.createdAt)}</span>
        }),
        columnHelper.accessor('authorName', {
            header: 'Added By',
            cell: ({ row }) => (
                <AuthorAvatar
                    name={row.original.authorName}
                    image={row.original.authorImage}
                />
            )
        })
    ]

    if (hasRole(role, 'member')) {
        columns.push(
            columnHelper.display({
                id: 'action',
                cell: context => (
                    <TableActions context={context} ledgerId={ledgerId} />
                )
            }) as (typeof columns)[number]
        )
    }

    return columns as ColumnDef<Entry, unknown>[]
}
