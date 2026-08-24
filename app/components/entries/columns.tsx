import { type ColumnDef, createColumnHelper } from '@tanstack/react-table'
import type { LedgerRole } from '@/lib/roles'
import { hasRole } from '@/lib/roles'
import type { Entry } from '@/types'

import AuthorAvatar from './author-avatar'
import TableActions from './table-actions'
import EntryTypeBadge from './type-badge'

const columnHelper = createColumnHelper<Entry>()

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
        columnHelper.accessor('name', { header: 'Name' }),
        columnHelper.accessor('description', {
            header: 'Description',
            cell: ({ row }) => <span>{row.original.description ?? '—'}</span>
        }),
        columnHelper.accessor('amount', {
            header: 'Amount',
            cell: ({ row }) => (
                <span>{currency.format(row.original.amount)}</span>
            )
        }),
        columnHelper.accessor('type', {
            header: 'Type',
            cell: ({ row }) => <EntryTypeBadge type={row.original.type} />
        }),
        columnHelper.accessor('createdAt', {
            header: 'Date Created',
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
