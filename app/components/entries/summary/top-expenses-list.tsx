import { formatCurrency } from '@/lib/currency'
import type { EntriesSummary } from '@/types'

const dateFormatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' })

export default function TopExpensesList({
    entries
}: {
    entries: EntriesSummary['topExpenses']
}) {
    if (entries.length === 0) {
        return <p className="text-muted-foreground text-sm">No expenses yet.</p>
    }

    return (
        <ol className="space-y-3">
            {entries.map(entry => (
                <li
                    key={entry.id}
                    className="flex items-center justify-between gap-4 text-sm"
                >
                    <div className="min-w-0">
                        <p className="truncate font-medium">{entry.name}</p>
                        <p className="text-muted-foreground text-xs">
                            {dateFormatter.format(new Date(entry.createdAt))}
                        </p>
                    </div>
                    <span className="shrink-0 font-mono font-medium text-destructive tabular-nums">
                        {formatCurrency(entry.amount)}
                    </span>
                </li>
            ))}
        </ol>
    )
}
