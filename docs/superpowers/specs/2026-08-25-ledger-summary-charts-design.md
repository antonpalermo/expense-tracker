# Ledger summary charts

Status: approved for implementation planning
Date: 2026-08-25

## Context

There is no summary/overview view of a ledger today — `$ledgerId/index.tsx`
renders only the paginated entries table. Entries carry no category field
(`worker/database/schemas/entries.ts`: `name`, `description`, `amount`,
`type` derived from the sign of `amount`, `userId` author, `createdAt`), so
any summary has to be built from time, amount sign, and author rather than
a category breakdown.

No charting library is installed in the repo. `app/components/ui/` is a
set of shadcn-style (`base-vega`) primitives; `card.tsx` already exists and
is reused here rather than introduced.

## Goals

1. A chart section on the entries page (`$ledgerId/index.tsx`) surfacing,
   for the whole ledger, all-time:
   - Cumulative balance trend, bucketed by month.
   - Total income vs total expense.
   - Per-member net contribution.
   - The 5 largest individual expenses.
2. Same access floor as the entries list: any ledger member with at least
   the `viewer` role can see it.
3. Always reflects current data — no cache layer, no explicit
   invalidation to maintain.
4. Doesn't block or get blocked by the entries table: independent loading
   state, independent failure handling.

## Non-goals

- Category breakdowns — no category field exists on entries; adding one is
  a separate feature.
- A date-range picker or rolling-window view — the trend is all-time,
  fixed, bucketed by month.
- Caching the aggregates (KV or otherwise) — the query is cheap and scoped
  to one ledger by an existing index; caching would add invalidation
  complexity for no measured benefit.
- A dedicated `/summary` route — the charts render inline, above the
  entries table, not as a separate page.
- Any chart type beyond the four above (e.g. a full category pie, a
  calendar heatmap) — not asked for.

## Design

### API contract: `GET /api/ledgers/:ledgerId/entries/summary`

Mounted in `worker/routes/entries.ts` **above** the existing `/:entryId`
routes, so `summary` isn't captured as an `:entryId` param. Gated by
`requireLedgerRole('viewer')` — identical access to the entries list.

Response (`EntriesSummary`, added next to `EntriesQuery`/`EntriesPage` in
`worker/database/schemas/entries.ts`):

```ts
type EntriesSummary = {
    balanceTrend: { month: string; balance: number }[] // '2026-03', cumulative, chronological
    totals: { income: number; expense: number } // expense as a positive magnitude
    byMember: {
        userId: string | null
        name: string
        image: string | null
        total: number // net amount, signed
    }[] // desc by |total|
    topExpenses: {
        id: string
        name: string
        amount: number
        createdAt: number
    }[] // 5 largest expenses, most negative first
}
```

### Service: `EntriesService.getSummary(ledgerId)`

Four queries run in one `Promise.all`, each scoped by
`eq(entriesTable.ledgerId, ledgerId)`, mirroring the query-building style
already used by `getEntries`:

- **Monthly net**: `SELECT strftime('%Y-%m', created_at/1000, 'unixepoch') AS month, SUM(amount) AS net FROM entries WHERE ledger_id = ? GROUP BY month ORDER BY month` via drizzle's `sql` template. The cumulative running balance is computed with a `reduce` over these rows in JS, not a SQL window function — the bucket count is small (at most one row per month of ledger history) and this sidesteps depending on D1's window-function support.
- **Totals**: total credit and total debit magnitude, each a `SUM(amount)` filtered by `type` (or a single query with `CASE WHEN`) — either is acceptable, implementation detail.
- **By-member**: `GROUP BY userId`, `leftJoin(user, eq(entriesTable.userId, user.id))` — same join `getEntries` uses, so an entry whose author was deleted (`userId: null`, per the documented "deleting a user must not delete entries" contract) is still represented, not silently dropped.
- **Top expenses**: `WHERE type = 'debit' ORDER BY amount ASC LIMIT 5`.

An empty ledger returns empty arrays and zeroed totals — `GROUP BY` over
zero rows naturally produces this, no special-casing needed.

Errors follow the existing convention: wrap the `Promise.all` in
try/catch, throw `HTTPException(INTERNAL_SERVER_ERROR, { message: 'Unable
to fetch ledger summary' })` on failure.

### Frontend data fetching

- `getEntriesSummary(ledgerId)` added to `app/apis/entries.ts`.
- `entriesKeys.summary(ledgerId)` added to `app/query-keys.ts`.
- Fetched via its own `useQuery` in `index.tsx`, independent of the
  table's `search`/`query` state — it does not refetch on sort, filter, or
  page changes, only when a mutation invalidates `entriesKeys.all`.

### Frontend components (`app/components/entries/summary/`)

- `summary-section.tsx` — top-level component. Renders a responsive grid
  of 4 `Card`s (reusing `app/components/ui/card.tsx`). Owns loading
  (`Skeleton` cards matching the grid layout), error (inline `Card` with
  the surfaced `{ msg }`), and empty-ledger states for the whole section.
  Empty state (`totals.income === 0 && totals.expense === 0 &&
  byMember.length === 0`) is a single "No entries yet" placeholder card
  instead of four empty charts.
- `balance-trend-chart.tsx` — `ChartContainer` + Recharts `AreaChart`,
  x-axis month, y-axis cumulative balance.
- `income-expense-chart.tsx` — the two raw totals as text, plus a small
  2-bar horizontal chart.
- `member-breakdown-chart.tsx` — horizontal `BarChart`, one bar per
  member, colored by net sign, labeled using the existing
  `author-avatar.tsx` treatment for visual consistency with the entries
  table.
- `top-expenses-list.tsx` — a ranked list, not a chart (name, amount,
  relative date) — clearer than a bar for 5 items with long names, and
  avoids a fifth chart type.

`SummarySection` renders in `index.tsx` between the ledger header and
`EntriesFilterBar`/`DataTable`.

### New dependency

`recharts`, installed via `bunx shadcn@latest add chart`, which also adds
`app/components/ui/chart.tsx` (the shadcn `ChartContainer`/`ChartTooltip`
wrapper with CSS-variable theming) — consistent with how the other
`app/components/ui/` primitives were added.

## Testing

Worker (`worker/test/routes/entries.test.ts`, following the route-level
TDD convention in `worker/CLAUDE.md`), exercising `GET
/api/ledgers/:ledgerId/entries/summary` via `req()` + `signInAs`:

- 404 for a non-member, 200 for a viewer — same role floor as the entries
  list.
- Empty ledger → all-zero/empty response shape, not an error.
- A seeded mix of credits/debits across two authors and two months →
  `totals.income`/`totals.expense` correct, `balanceTrend` cumulative and
  chronological, `byMember` totals correct, `topExpenses` sorted and
  capped at 5.
- An entry with a deleted author (`userId: null`) still appears in
  `byMember` rather than being dropped.

Frontend: this repo has no frontend test infra (`app/CLAUDE.md` — app/
verification is manual). `SummarySection` gets manual verification: a
ledger with entries, an empty ledger, and a non-viewer role, in the
browser.
