# Ledger Summary Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a chart section (balance trend, income vs expense, per-member breakdown, top expenses) above the entries table, backed by one new aggregation endpoint.

**Architecture:** One new `GET /api/ledgers/:ledgerId/entries/summary` route computes all four aggregates in a single service call via `Promise.all` over indexed SQL queries, no caching. The frontend fetches it with its own `useQuery` (independent of the entries table's search/sort/filter/page state) and renders it as a 4-card grid of shadcn/Recharts components inserted into the existing `$ledgerId/index.tsx`.

**Tech Stack:** Hono + Drizzle + D1 (worker), TanStack Query + Recharts via shadcn's `chart.tsx` wrapper (app).

**Spec:** `docs/superpowers/specs/2026-08-25-ledger-summary-charts-design.md`

## Global Constraints

- No category field exists on entries — all aggregation is by time, amount sign, and author. Do not add a category column.
- All-time, fixed range, bucketed by month. No date-range picker.
- No caching layer (KV or otherwise) for the summary — compute fresh from D1 on every request.
- The summary renders inline above the entries table in the existing `$ledgerId/index.tsx` — no new route/page.
- `GET /entries/summary` is gated by `requireLedgerRole('viewer')`, identical to the entries list.
- "Top expenses" = the 5 largest debits by absolute value (most negative `amount`), not a mix of signs.
- Package manager is **bun**. Formatting/linting is Biome (single quotes, no semicolons, 4-space indent, no trailing commas) — the pre-commit hook (`lint-staged` → `biome check --write`) auto-fixes this on every commit, so hand-formatting generated code to match is not required before committing.
- `db.transaction()` does not work on D1 — not applicable here (no multi-statement write in this feature), but do not introduce one.

---

## Task 1: Backend — `GET /api/ledgers/:ledgerId/entries/summary`

**Files:**
- Modify: `worker/services/entries.ts` — add `getSummary`
- Modify: `worker/routes/entries.ts` — add the route
- Modify: `worker/test/factories.ts` — add `createEntry`
- Test: `worker/test/routes/entries.test.ts` — new `describe('GET /api/ledgers/:ledgerId/entries/summary', ...)` block

**Interfaces:**
- Produces: `EntriesService.getSummary(ledgerId: string): Promise<{ balanceTrend: { month: string; balance: number }[]; totals: { income: number; expense: number }; byMember: { userId: string | null; name: string | null; image: string | null; total: number }[]; topExpenses: { id: string; name: string; amount: number; createdAt: Date }[] }>`
- Produces: `createEntry(options: { ledgerId: string; userId?: string | null; name?: string; amount: number; createdAt?: Date }): Promise<typeof entriesTable.$inferSelect>` in `worker/test/factories.ts`, for direct-insert control over `createdAt`/`amount`/`userId` that the existing HTTP-only test helpers don't give.
- Route: `GET /api/ledgers/:ledgerId/entries/summary` → 200 with the shape above; 404 for a non-member; 403 is not reachable here since `viewer` is the lowest role.

- [ ] **Step 1: Add the `createEntry` test factory**

In `worker/test/factories.ts`, add `entriesTable` and `entryTypeFor` to the existing `@/database/schemas` import:

```ts
import {
    account,
    entriesTable,
    entryTypeFor,
    formTable,
    ledgerInvitationsTable,
    ledgerMembersTable,
    ledgersTable,
    user
} from '@/database/schemas'
```

Then add this function anywhere after `createLedger`:

```ts
export async function createEntry(options: {
    ledgerId: string
    userId?: string | null
    name?: string
    amount: number
    createdAt?: Date
}) {
    const [created] = await db
        .insert(entriesTable)
        .values({
            ledgerId: options.ledgerId,
            userId: options.userId ?? null,
            name: options.name ?? 'Test entry',
            amount: options.amount,
            type: entryTypeFor(options.amount),
            ...(options.createdAt ? { createdAt: options.createdAt } : {})
        })
        .returning()

    return created
}
```

- [ ] **Step 2: Write the failing tests**

In `worker/test/routes/entries.test.ts`, add `createEntry` to the existing factories import:

```ts
import { createEntry, createLedger, createUser, req } from '@/test/factories'
```

Then append this block at the end of the file:

```ts
describe('GET /api/ledgers/:ledgerId/entries/summary', () => {
    test('a non-member gets 404, a viewer gets 200', async () => {
        const owner = await createUser()
        const viewer = await createUser()
        const outsider = await createUser()
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: viewer.id, role: 'viewer' }]
        })

        await signInAs(outsider)
        const outsiderRes = await req(
            `/api/ledgers/${ledgerId}/entries/summary`
        )
        expect(outsiderRes.status).toBe(404)

        await signInAs(viewer)
        const viewerRes = await req(`/api/ledgers/${ledgerId}/entries/summary`)
        expect(viewerRes.status).toBe(200)
    })

    test('an empty ledger returns zeroed totals and empty lists', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/entries/summary`)
        const body = (await res.json()) as {
            balanceTrend: unknown[]
            totals: { income: number; expense: number }
            byMember: unknown[]
            topExpenses: unknown[]
        }

        expect(body.balanceTrend).toEqual([])
        expect(body.totals).toEqual({ income: 0, expense: 0 })
        expect(body.byMember).toEqual([])
        expect(body.topExpenses).toEqual([])
    })

    test('totals, cumulative balance trend, by-member totals and top expenses are computed across two authors and two months', async () => {
        const owner = await createUser({ name: 'Ada Lovelace' })
        const member = await createUser({ name: 'Grace Hopper' })
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: member.id, role: 'member' }]
        })

        await createEntry({
            ledgerId,
            userId: owner.id,
            name: 'January rent',
            amount: -1000,
            createdAt: new Date('2026-01-15T00:00:00.000Z')
        })
        await createEntry({
            ledgerId,
            userId: owner.id,
            name: 'January salary',
            amount: 3000,
            createdAt: new Date('2026-01-20T00:00:00.000Z')
        })
        await createEntry({
            ledgerId,
            userId: member.id,
            name: 'February groceries',
            amount: -200,
            createdAt: new Date('2026-02-05T00:00:00.000Z')
        })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/entries/summary`)
        const body = (await res.json()) as {
            balanceTrend: { month: string; balance: number }[]
            totals: { income: number; expense: number }
            byMember: {
                userId: string | null
                name: string | null
                image: string | null
                total: number
            }[]
            topExpenses: { name: string; amount: number }[]
        }

        expect(body.totals).toEqual({ income: 3000, expense: 1200 })

        expect(body.balanceTrend).toEqual([
            { month: '2026-01', balance: 2000 },
            { month: '2026-02', balance: 1800 }
        ])

        expect(body.byMember).toEqual(
            expect.arrayContaining([
                {
                    userId: owner.id,
                    name: 'Ada Lovelace',
                    image: null,
                    total: 2000
                },
                {
                    userId: member.id,
                    name: 'Grace Hopper',
                    image: null,
                    total: -200
                }
            ])
        )

        expect(body.topExpenses.map(entry => entry.name)).toEqual([
            'January rent',
            'February groceries'
        ])
    })

    test('an entry whose author was deleted is still included in the by-member breakdown', async () => {
        const owner = await createUser()
        const author = await createUser({ name: 'Departing Member' })
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: author.id, role: 'member' }]
        })

        await createEntry({
            ledgerId,
            userId: author.id,
            name: 'Orphaned expense',
            amount: -50
        })

        await db.delete(user).where(eq(user.id, author.id))

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/entries/summary`)
        const body = (await res.json()) as {
            byMember: {
                userId: string | null
                name: string | null
                image: string | null
                total: number
            }[]
        }

        expect(body.byMember).toEqual([
            { userId: null, name: null, image: null, total: -50 }
        ])
    })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `bun run test -- entries.test.ts`
Expected: FAIL — `GET /api/ledgers/:ledgerId/entries/summary` returns 404 for everyone (falls through to the `:entryId` handler, which finds no entry named `summary`), not the new behavior.

- [ ] **Step 4: Implement `getSummary`**

In `worker/services/entries.ts`, add `sql` to the existing drizzle-orm import:

```ts
import {
    and,
    asc,
    count,
    desc,
    eq,
    inArray,
    like,
    or,
    sql,
    type SQL
} from 'drizzle-orm'
```

Then add this function (after `getEntries` is a natural spot):

```ts
export async function getSummary(ledgerId: string) {
    try {
        const monthExpr = sql<string>`strftime('%Y-%m', ${entriesTable.createdAt} / 1000, 'unixepoch')`

        const [monthlyRows, [totalsRow], byMember, topExpenses] =
            await Promise.all([
                db
                    .select({
                        month: monthExpr,
                        net: sql<number>`sum(${entriesTable.amount})`
                    })
                    .from(entriesTable)
                    .where(eq(entriesTable.ledgerId, ledgerId))
                    .groupBy(monthExpr)
                    .orderBy(monthExpr),
                db
                    .select({
                        income: sql<number>`coalesce(sum(case when ${entriesTable.type} = 'credit' then ${entriesTable.amount} else 0 end), 0)`,
                        expense: sql<number>`coalesce(sum(case when ${entriesTable.type} = 'debit' then -${entriesTable.amount} else 0 end), 0)`
                    })
                    .from(entriesTable)
                    .where(eq(entriesTable.ledgerId, ledgerId)),
                db
                    .select({
                        userId: entriesTable.userId,
                        name: user.name,
                        image: user.image,
                        total: sql<number>`sum(${entriesTable.amount})`
                    })
                    .from(entriesTable)
                    .leftJoin(user, eq(entriesTable.userId, user.id))
                    .where(eq(entriesTable.ledgerId, ledgerId))
                    .groupBy(entriesTable.userId, user.name, user.image)
                    .orderBy(sql`abs(sum(${entriesTable.amount})) desc`),
                db
                    .select({
                        id: entriesTable.id,
                        name: entriesTable.name,
                        amount: entriesTable.amount,
                        createdAt: entriesTable.createdAt
                    })
                    .from(entriesTable)
                    .where(
                        and(
                            eq(entriesTable.ledgerId, ledgerId),
                            eq(entriesTable.type, 'debit')
                        )
                    )
                    .orderBy(asc(entriesTable.amount))
                    .limit(5)
            ])

        let running = 0
        const balanceTrend = monthlyRows.map(row => {
            running += row.net
            return { month: row.month, balance: running }
        })

        return {
            balanceTrend,
            totals: {
                income: totalsRow?.income ?? 0,
                expense: totalsRow?.expense ?? 0
            },
            byMember,
            topExpenses
        }
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to fetch ledger summary'
        })
    }
}
```

- [ ] **Step 5: Wire the route**

In `worker/routes/entries.ts`, add a `.get('/summary', ...)` right after the existing `.get('/', ...)` list route (before `.post('/', ...)`), so it's grouped with the other list-shaped GET and registered ahead of `.get('/:entryId', ...)`:

```ts
    .get(
        '/summary',
        requireLedgerRole('viewer'),
        async ctx => {
            return ctx.json(
                await EntriesService.getSummary(ctx.get('ledgerId'))
            )
        }
    )
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `bun run test -- entries.test.ts`
Expected: PASS, all tests in the file including the new `describe` block.

- [ ] **Step 7: Typecheck**

Run: `bun run build`
Expected: succeeds (this also runs `tsc -b`, which typechecks the test file).

- [ ] **Step 8: Commit**

```bash
git add worker/services/entries.ts worker/routes/entries.ts worker/test/factories.ts worker/test/routes/entries.test.ts
git commit -m "feat(worker): add GET /ledgers/:ledgerId/entries/summary aggregation endpoint"
```

---

## Task 2: Frontend — types, API wrapper, query keys, invalidation fix

**Files:**
- Modify: `app/types.ts` — add `EntriesSummary`
- Modify: `app/apis/entries.ts` — add `getEntriesSummary`
- Modify: `app/query-keys.ts` — add `entriesKeys.summary` and `entriesKeys.byLedgerAll`
- Modify: `app/components/entries/dialog-confirmation.tsx` — invalidate `byLedgerAll` instead of `byLedger(ledgerId, {})`
- Modify: `app/components/entries/form.tsx` — same invalidation fix

**Interfaces:**
- Consumes: `GET /api/ledgers/:ledgerId/entries/summary` from Task 1.
- Produces: `type EntriesSummary` in `app/types.ts`; `getEntriesSummary(ledgerId: string): Promise<EntriesSummary>` in `app/apis/entries.ts`; `entriesKeys.summary(ledgerId: string)` and `entriesKeys.byLedgerAll(ledgerId: string)` in `app/query-keys.ts`. Task 3 and 4 consume all three.

**Why the invalidation fix:** `entriesKeys.byLedger(ledgerId, {})` produces the query key `['ENTRIES', ledgerId, {}]`. TanStack Query's partial-match invalidation compares by type at each position, so a `{}` filter element does **not** match a `'SUMMARY'` string element at the same position — invalidating `byLedger(ledgerId, {})` after a mutation would never refetch the summary. `entriesKeys.byLedgerAll(ledgerId)` (`['ENTRIES', ledgerId]`, one element shorter) matches both `entriesKeys.byLedger(ledgerId, anyQuery)` and `entriesKeys.summary(ledgerId)` as a prefix, so a single invalidation call refreshes both.

- [ ] **Step 1: Add the `EntriesSummary` type**

In `app/types.ts`, add near the other `Entries*` types (after `EntriesPage`):

```ts
export type EntriesSummary = {
    balanceTrend: { month: string; balance: number }[]
    totals: { income: number; expense: number }
    byMember: {
        userId: string | null
        name: string | null
        image: string | null
        total: number
    }[]
    topExpenses: {
        id: string
        name: string
        amount: number
        createdAt: Date
    }[]
}
```

- [ ] **Step 2: Add the API wrapper**

In `app/apis/entries.ts`, update the type import and add the function:

```ts
import type {
    EntriesPage,
    EntriesQuery,
    EntriesSummary,
    EntryPayload,
    EntryRow
} from '@/types'
```

```ts
export async function getEntriesSummary(ledgerId: string) {
    return await request<EntriesSummary>(
        `/api/ledgers/${ledgerId}/entries/summary`
    )
}
```

- [ ] **Step 3: Add query keys**

In `app/query-keys.ts`, replace the `entriesKeys` object:

```ts
export const entriesKeys = {
    all: ['ENTRIES'] as const,
    byLedgerAll: (ledgerId: string) => ['ENTRIES', ledgerId] as const,
    byLedger: (ledgerId: string, query: EntriesQuery) =>
        ['ENTRIES', ledgerId, query] as const,
    summary: (ledgerId: string) => ['ENTRIES', ledgerId, 'SUMMARY'] as const
}
```

- [ ] **Step 4: Fix the two invalidation call sites**

In `app/components/entries/dialog-confirmation.tsx`, change:

```ts
            await queryClient.invalidateQueries({
                queryKey: entriesKeys.byLedger(variables.ledgerId, {})
            })
```

to:

```ts
            await queryClient.invalidateQueries({
                queryKey: entriesKeys.byLedgerAll(variables.ledgerId)
            })
```

In `app/components/entries/form.tsx`, change:

```ts
    const invalidate = async () => {
        await queryClient.invalidateQueries({
            queryKey: entriesKeys.byLedger(ledgerId, {})
        })
    }
```

to:

```ts
    const invalidate = async () => {
        await queryClient.invalidateQueries({
            queryKey: entriesKeys.byLedgerAll(ledgerId)
        })
    }
```

- [ ] **Step 5: Typecheck**

Run: `bun run build`
Expected: succeeds with no type errors.

- [ ] **Step 6: Commit**

```bash
git add app/types.ts app/apis/entries.ts app/query-keys.ts app/components/entries/dialog-confirmation.tsx app/components/entries/form.tsx
git commit -m "feat(app): add entries summary API wrapper and fix cache invalidation to cover it"
```

---

## Task 3: Frontend — chart primitives

**Files:**
- Create: `app/components/ui/chart.tsx` (via `bun add recharts` + hand-written content below — see note)
- Create: `app/lib/currency.ts`
- Create: `app/components/entries/summary/balance-trend-chart.tsx`
- Create: `app/components/entries/summary/income-expense-chart.tsx`
- Create: `app/components/entries/summary/member-breakdown-chart.tsx`
- Create: `app/components/entries/summary/top-expenses-list.tsx`

**Interfaces:**
- Consumes: `EntriesSummary` from Task 2.
- Produces: `BalanceTrendChart({ data: EntriesSummary['balanceTrend'] })`, `IncomeExpenseChart({ totals: EntriesSummary['totals'] })`, `MemberBreakdownChart({ data: EntriesSummary['byMember'] })`, `TopExpensesList({ entries: EntriesSummary['topExpenses'] })` — all default exports, all consumed by Task 4's `summary-section.tsx`.
- Produces: `formatCurrency(amount: number): string` in `app/lib/currency.ts`.

**Note on `chart.tsx`:** this is shadcn's standard chart wrapper (`ChartContainer`/`ChartTooltip`/`ChartTooltipContent`/`ChartConfig`), which does not depend on this repo's `base-vega` style or on Radix/`@base-ui` — it's plain React + Recharts, so the upstream file works unmodified here. `app/index.css` already defines `--chart-1` through `--chart-5` (and `--color-chart-*` theme mappings), so no CSS changes are needed for it to pick up the app's theme in light and dark mode.

- [ ] **Step 1: Install recharts**

Run: `bun add recharts`
Expected: `recharts` added to `package.json` dependencies and `bun.lock` updated.

- [ ] **Step 2: Create `app/components/ui/chart.tsx`**

Create the directory structure if needed, then write this file exactly as shown (this is shadcn's unmodified chart component source — the pre-commit hook's `biome check --write` will reformat it to this repo's style, quotes/semicolons included, on commit; do not hand-reformat it first):

```tsx
import * as React from "react"
import * as RechartsPrimitive from "recharts"
import type { TooltipValueType } from "recharts"

import { cn } from "@/lib/utils"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const

const INITIAL_DIMENSION = { width: 320, height: 200 } as const
type TooltipNameType = number | string

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
>

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  initialDimension = INITIAL_DIMENSION,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"]
  initialDimension?: {
    width: number
    height: number
  }
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer
          initialDimension={initialDimension}
        >
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.theme ?? config.color
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ??
      itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dot" | "dashed"
    nameKey?: string
    labelKey?: string
  } & Omit<
    RechartsPrimitive.DefaultTooltipContentProps<
      TooltipValueType,
      TooltipNameType
    >,
    "accessibilityLayer"
  >) {
  const { config } = useChart()

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null
    }

    const [item] = payload
    const key = `${labelKey ?? item?.dataKey ?? item?.name ?? "value"}`
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const value =
      !labelKey && typeof label === "string"
        ? (config[label]?.label ?? label)
        : itemConfig?.label

    if (labelFormatter) {
      return (
        <div className={cn("font-medium", labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      )
    }

    if (!value) {
      return null
    }

    return <div className={cn("font-medium", labelClassName)}>{value}</div>
  }, [
    label,
    labelFormatter,
    payload,
    hideLabel,
    labelClassName,
    config,
    labelKey,
  ])

  if (!active || !payload?.length) {
    return null
  }

  const nestLabel = payload.length === 1 && indicator !== "dot"

  return (
    <div
      className={cn(
        "grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload
          .filter((item) => item.type !== "none")
          .map((item, index) => {
            const key = `${nameKey ?? item.name ?? item.dataKey ?? "value"}`
            const itemConfig = getPayloadConfigFromPayload(config, item, key)
            const indicatorColor = color ?? item.payload?.fill ?? item.color

            return (
              <div
                key={index}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  indicator === "dot" && "items-center"
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn(
                            "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                            {
                              "h-2.5 w-2.5": indicator === "dot",
                              "w-1": indicator === "line",
                              "w-0 border-[1.5px] border-dashed bg-transparent":
                                indicator === "dashed",
                              "my-0.5": nestLabel && indicator === "dashed",
                            }
                          )}
                          style={
                            {
                              "--color-bg": indicatorColor,
                              "--color-border": indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        "flex flex-1 justify-between leading-none",
                        nestLabel ? "items-end" : "items-center"
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">
                          {itemConfig?.label ?? item.name}
                        </span>
                      </div>
                      {item.value != null && (
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {typeof item.value === "number"
                            ? item.value.toLocaleString()
                            : String(item.value)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}

const ChartLegend = RechartsPrimitive.Legend

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> & {
  hideIcon?: boolean
  nameKey?: string
} & RechartsPrimitive.DefaultLegendContentProps) {
  const { config } = useChart()

  if (!payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {payload
        .filter((item) => item.type !== "none")
        .map((item, index) => {
          const key = `${nameKey ?? item.dataKey ?? "value"}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)

          return (
            <div
              key={index}
              className={cn(
                "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
              )}
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfig?.label}
            </div>
          )
        })}
    </div>
  )
}

function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey: string = key

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string
  }

  return configLabelKey in config ? config[configLabelKey] : config[key]
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
```

- [ ] **Step 3: Create the currency helper**

Create `app/lib/currency.ts`:

```ts
const formatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
})

export function formatCurrency(amount: number) {
    return formatter.format(amount)
}
```

- [ ] **Step 4: Create the balance trend chart**

Create `app/components/entries/summary/balance-trend-chart.tsx`:

```tsx
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
```

- [ ] **Step 5: Create the income vs expense chart**

Create `app/components/entries/summary/income-expense-chart.tsx`:

```tsx
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
```

- [ ] **Step 6: Create the member breakdown chart**

Create `app/components/entries/summary/member-breakdown-chart.tsx`:

```tsx
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
                            formatter={(value, _name, _item, _index, payload) => (
                                <div className="flex w-full items-center justify-between gap-4">
                                    <span className="text-muted-foreground">
                                        {(payload as { name: string }).name}
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
                        <Cell key={entry.name} fill={entry.fill} />
                    ))}
                </Bar>
            </BarChart>
        </ChartContainer>
    )
}
```

- [ ] **Step 7: Create the top expenses list**

Create `app/components/entries/summary/top-expenses-list.tsx`:

```tsx
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
```

- [ ] **Step 8: Typecheck**

Run: `bun run build`
Expected: succeeds with no type errors.

- [ ] **Step 9: Commit**

```bash
git add package.json bun.lock app/components/ui/chart.tsx app/lib/currency.ts app/components/entries/summary
git commit -m "feat(app): add recharts-based summary chart components"
```

---

## Task 4: Frontend — wire the summary section into the entries page

**Files:**
- Create: `app/components/entries/summary/summary-section.tsx`
- Modify: `app/routes/_dashboard/ledgers/$ledgerId/index.tsx`

**Interfaces:**
- Consumes: `getEntriesSummary` (Task 2), `entriesKeys.summary` (Task 2), `BalanceTrendChart` / `IncomeExpenseChart` / `MemberBreakdownChart` / `TopExpensesList` (Task 3).
- Produces: `SummarySection({ ledgerId: string })`, rendered once from `EntriesPage`.

- [ ] **Step 1: Create the summary section**

Create `app/components/entries/summary/summary-section.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import { getEntriesSummary } from '@/apis/entries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { entriesKeys } from '@/query-keys'
import BalanceTrendChart from './balance-trend-chart'
import IncomeExpenseChart from './income-expense-chart'
import MemberBreakdownChart from './member-breakdown-chart'
import TopExpensesList from './top-expenses-list'

export default function SummarySection({ ledgerId }: { ledgerId: string }) {
    const { data, isPending, isError, error } = useQuery({
        queryKey: entriesKeys.summary(ledgerId),
        queryFn: () => getEntriesSummary(ledgerId)
    })

    if (isPending) {
        return (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
            </div>
        )
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
```

- [ ] **Step 2: Wire it into the entries page**

In `app/routes/_dashboard/ledgers/$ledgerId/index.tsx`, add the import:

```ts
import SummarySection from '@/components/entries/summary/summary-section'
```

Then render it between the header row and `<EntriesFilterBar`:

```tsx
            <EntryFormDialog />
            <DialogConfirmation />

            <div className="flex items-center justify-between">
                <h2 className="font-bold text-2xl">Expenses</h2>
                <RoleGate role={role} required="member">
                    <Button
                        onClick={() =>
                            entryHandler.openWithPayload({
                                type: 'create',
                                ledgerId
                            })
                        }
                    >
                        <Plus className="size-4" />
                        Create
                    </Button>
                </RoleGate>
            </div>

            <SummarySection ledgerId={ledgerId} />

            <EntriesFilterBar
```

(only the `<SummarySection ledgerId={ledgerId} />` line is new — the surrounding JSX is shown for placement).

- [ ] **Step 3: Typecheck**

Run: `bun run build`
Expected: succeeds with no type errors.

- [ ] **Step 4: Lint**

Run: `bun run lint`
Expected: no new errors introduced by this task.

- [ ] **Step 5: Manual verification**

Run: `bun wrangler d1 migrations apply xpens --local` (only if not already applied on this machine), then `bun dev`.

In the browser:
1. Open a ledger that has entries spanning at least two months and more than one author. Confirm all four cards render: a balance trend area chart, an income/expense bar with the two totals as text above it, a top-5-expenses list, and a per-member bar chart. Hover each chart to confirm tooltips show sensible labels and currency-formatted values.
2. Open (or create) a ledger with zero entries. Confirm the section shows the single "No entries yet" card instead of four charts.
3. Toggle the OS/browser color scheme (or the app's theme control, if any) between light and dark. Confirm the charts' colors switch with the theme (via the `--chart-*`/`--success`/`--destructive` CSS variables) and stay legible.
4. Create, edit, and delete an entry from the table below the summary. Confirm the summary cards update after each mutation (this exercises the `byLedgerAll` invalidation fix from Task 2).

- [ ] **Step 6: Commit**

```bash
git add app/components/entries/summary/summary-section.tsx app/routes/_dashboard/ledgers/\$ledgerId/index.tsx
git commit -m "feat(app): render the ledger summary section above the entries table"
```
