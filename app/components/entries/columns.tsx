import { createColumnHelper } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import type { Entry } from '@/types'

import TableActions from './table-actions'

const columnHelper = createColumnHelper<Entry>()

const parseDate = (input: Date) => {
    const date = new Date(input)
    return Intl.DateTimeFormat('en-PH', {
        dateStyle: 'medium'
    }).format(date)
}

export const columns = [
    columnHelper.display({
        id: 'select',
        header: () => <Checkbox />,
        cell: () => <Checkbox />
    }),
    columnHelper.accessor('name', {
        header: 'Name'
    }),
    columnHelper.accessor('description', {
        header: 'Description'
    }),
    columnHelper.accessor('amount', {
        header: 'Amount'
    }),
    columnHelper.accessor('createdAt', {
        header: 'Date Created',
        cell: ({ row }) => {
            const date = parseDate(row.original.createdAt)
            return <span>{date}</span>
        }
    }),
    columnHelper.display({
        id: 'action',
        cell: context => <TableActions context={context} />
    })
]
