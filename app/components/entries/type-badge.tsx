import { Badge } from '@/components/ui/badge'
import type { EntryType } from '../../../worker/database/schemas/entries'

// Type-only import from ../worker, or drizzle lands in the client bundle.

const VARIANT: Record<EntryType, 'destructive' | 'success'> = {
    debit: 'destructive',
    credit: 'success'
}

const LABEL: Record<EntryType, string> = {
    debit: 'Debit',
    credit: 'Credit'
}

export default function EntryTypeBadge({ type }: { type: EntryType }) {
    return <Badge variant={VARIANT[type]}>{LABEL[type]}</Badge>
}
