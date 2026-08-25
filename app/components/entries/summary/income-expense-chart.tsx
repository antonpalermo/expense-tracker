import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts'
import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent
} from '@/components/ui/chart'
import { formatCurrency } from '@/lib/currency'
import type { EntriesSummary } from '@/types'

const chartConfig = {
    income: { label: 'Income', color: 'var(--chart-1)' },
    expense: { label: 'Expense', color: 'var(--destructive)' }
} satisfies ChartConfig

export default function IncomeExpenseChart({
    totals
}: {
    totals: EntriesSummary['totals']
}) {
    const data = [
        { category: 'income', label: 'Income', value: totals.income },
        { category: 'expense', label: 'Expense', value: totals.expense }
    ]

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Income</span>
                <span className="font-mono font-medium tabular-nums">
                    {formatCurrency(totals.income)}
                </span>
            </div>
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Expense</span>
                <span className="font-mono font-medium tabular-nums">
                    {formatCurrency(totals.expense)}
                </span>
            </div>
            <ChartContainer
                config={chartConfig}
                className="aspect-auto h-24 w-full"
            >
                <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
                    <YAxis
                        dataKey="label"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        width={56}
                    />
                    <XAxis dataKey="value" type="number" hide />
                    <ChartTooltip
                        content={
                            <ChartTooltipContent hideLabel nameKey="category" />
                        }
                    />
                    <Bar dataKey="value" radius={4}>
                        {data.map(entry => (
                            <Cell
                                key={entry.category}
                                fill={`var(--color-${entry.category})`}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ChartContainer>
        </div>
    )
}
