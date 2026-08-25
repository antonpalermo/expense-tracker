import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent
} from '@/components/ui/chart'
import { formatCurrency } from '@/lib/currency'
import type { EntriesSummary } from '@/types'

const chartConfig = {
    balance: {
        label: 'Balance',
        color: 'var(--chart-1)'
    }
} satisfies ChartConfig

export default function BalanceTrendChart({
    data
}: {
    data: EntriesSummary['balanceTrend']
}) {
    return (
        <ChartContainer
            config={chartConfig}
            className="aspect-auto h-56 w-full"
        >
            <AreaChart data={data} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                />
                <ChartTooltip
                    content={
                        <ChartTooltipContent
                            formatter={(value, name) => (
                                <div className="flex w-full items-center justify-between gap-4">
                                    <span className="text-muted-foreground capitalize">
                                        {name}
                                    </span>
                                    <span className="font-mono font-medium tabular-nums">
                                        {formatCurrency(Number(value))}
                                    </span>
                                </div>
                            )}
                        />
                    }
                />
                <Area
                    dataKey="balance"
                    type="monotone"
                    fill="var(--color-balance)"
                    stroke="var(--color-balance)"
                    fillOpacity={0.2}
                />
            </AreaChart>
        </ChartContainer>
    )
}
