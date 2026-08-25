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
    total: { label: 'Net total' }
} satisfies ChartConfig

export default function MemberBreakdownChart({
    data
}: {
    data: EntriesSummary['byMember']
}) {
    const chartData = data.map(member => ({
        userId: member.userId,
        name: member.name ?? 'Deleted user',
        total: member.total,
        fill: member.total >= 0 ? 'var(--success)' : 'var(--destructive)'
    }))

    return (
        <ChartContainer
            config={chartConfig}
            className="aspect-auto w-full"
            style={{ height: Math.max(chartData.length * 40, 80) }}
        >
            <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
                <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={96}
                />
                <XAxis dataKey="total" type="number" hide />
                <ChartTooltip
                    content={
                        <ChartTooltipContent
                            hideLabel
                            formatter={(
                                value,
                                _name,
                                _item,
                                _index,
                                payload
                            ) => (
                                <div className="flex w-full items-center justify-between gap-4">
                                    <span className="text-muted-foreground">
                                        {
                                            (
                                                payload as unknown as {
                                                    name: string
                                                }
                                            ).name
                                        }
                                    </span>
                                    <span className="font-mono font-medium tabular-nums">
                                        {formatCurrency(Number(value))}
                                    </span>
                                </div>
                            )}
                        />
                    }
                />
                <Bar dataKey="total" radius={4}>
                    {chartData.map(entry => (
                        <Cell
                            key={entry.userId ?? entry.name}
                            fill={entry.fill}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ChartContainer>
    )
}
