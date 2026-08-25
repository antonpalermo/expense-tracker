import { useQuery } from '@tanstack/react-query'
import { getEntriesSummary } from '@/apis/entries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { entriesKeys } from '@/query-keys'
import BalanceTrendChart from './balance-trend-chart'
import IncomeExpenseChart from './income-expense-chart'
import MemberBreakdownChart from './member-breakdown-chart'
import SummarySkeleton from './summary-skeleton'
import TopExpensesList from './top-expenses-list'

export default function SummarySection({ ledgerId }: { ledgerId: string }) {
    const { data, isPending, isError, error } = useQuery({
        queryKey: entriesKeys.summary(ledgerId),
        queryFn: () => getEntriesSummary(ledgerId)
    })

    if (isPending) {
        return <SummarySkeleton />
    }

    if (isError) {
        return (
            <Card>
                <CardContent>
                    <p className="text-destructive text-sm">{error.message}</p>
                </CardContent>
            </Card>
        )
    }

    const isEmpty =
        data.totals.income === 0 &&
        data.totals.expense === 0 &&
        data.byMember.length === 0

    if (isEmpty) {
        return (
            <Card>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                        No entries yet — add one to see the ledger summary.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="xl:col-span-2">
                <CardHeader>
                    <CardTitle>Balance trend</CardTitle>
                </CardHeader>
                <CardContent>
                    <BalanceTrendChart data={data.balanceTrend} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Income vs expense</CardTitle>
                </CardHeader>
                <CardContent>
                    <IncomeExpenseChart totals={data.totals} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Top expenses</CardTitle>
                </CardHeader>
                <CardContent>
                    <TopExpensesList entries={data.topExpenses} />
                </CardContent>
            </Card>
            <Card className="xl:col-span-2">
                <CardHeader>
                    <CardTitle>By member</CardTitle>
                </CardHeader>
                <CardContent>
                    <MemberBreakdownChart data={data.byMember} />
                </CardContent>
            </Card>
        </div>
    )
}
