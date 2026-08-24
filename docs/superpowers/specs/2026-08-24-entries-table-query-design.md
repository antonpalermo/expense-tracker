# Entries table: search, sort, multi-author filter, server-side pagination

Status: approved for implementation planning
Date: 2026-08-24

## Context

`$ledgerId/index.tsx` fetches every entry for a ledger in one shot
(`getEntries` → `GET /api/ledgers/:ledgerId/entries`, `SELECT * ... WHERE
ledgerId = ? ORDER BY createdAt DESC`, no limit/offset) and renders it
through `DataTable`, which only wires up `getCoreRowModel()` — no sorting,
filtering, or pagination model at all. There is no way to search, sort, or
filter the list today; a ledger with a lot of history sends its entire
row set to the client on every visit.

The current branch is `feat/entries-table-query`, which already names the
direction: querying happens server-side, not by fetching everything and
filtering in the browser. Ledger size is expected to grow unboundedly over
time, so the design optimizes for that rather than for today's (small)
data volume.

`DataTable` (`app/components/data-table.tsx`) has exactly one consumer, so
extending its props in place is safe — no need to fork it.
`app/components/entries/columns.tsx` already builds columns via a
`createColumnHelper<Entry>()` factory function (`createColumns(ledgerId,
role)`), which the new sort-toggle headers extend.

Ledger membership already has a working list endpoint
(`getMembers` → `GET /api/ledgers/:ledgerId/members`) that the author
filter reuses directly — no new endpoint needed for the filter's option
list.

## Goals

1. Free-text search over an entry's name, description, and author name.
2. Sorting by date created, amount, and name (ascending/descending).
3. Filtering by one or more entry authors (ledger members), multi-select.
4. Server-side, page-based pagination (20 rows/page) so payload size and
   render cost stay bounded regardless of ledger size.
5. Search/sort/filter/page state lives in the URL (TanStack Router search
   params) — shareable, survives refresh and back/forward navigation.
6. Smooth pagination: no loading-skeleton flash when moving between pages
   that are cheap to fetch, and the next page is often already warm by the
   time the user clicks to it.

## Non-goals

- Filtering/sorting by entry type (debit/credit) or amount range — not
  asked for; can be added later following the same pattern.
- Virtualized/windowed rendering of the row list — pagination already
  bounds the DOM size to `pageSize` rows.
- Changing `DataTable` into a fully generic reusable data-table component
  with a public manual-mode API contract — it gets just the props this
  feature needs, since it still has exactly one consumer.
- Full-text/fuzzy search ranking — a straightforward `LIKE` match is
  sufficient at this scale and keeps the query index-friendly.

## Design

### API contract: `GET /api/ledgers/:ledgerId/entries`

New query parameters, all optional:

| param        | type                              | default      |
|--------------|-----------------------------------|--------------|
| `q`          | string                            | —            |
| `sort`       | `'date' \| 'amount' \| 'name'`    | `'date'`     |
| `order`      | `'asc' \| 'desc'`                 | `'desc'`     |
| `authorIds`  | string[]                          | —            |
| `page`       | number (1-indexed)                | `1`          |
| `pageSize`   | number                            | `20`         |

Response shape changes from `Entry[]` to:

```ts
type EntriesPage = {
    data: Entry[]
    page: number
    pageSize: number
    total: number
    totalPages: number
}
```

This is a breaking change to the endpoint's response shape. It has exactly
one consumer (`$ledgerId/index.tsx`), so this is a direct cutover, not a
versioned rollout.

Validation follows the existing `validate('query', schema)` middleware
pattern (`worker/lib/validator.ts`). A new `entriesQuerySchema` (zod, in
`worker/database/schemas/entries.ts` alongside `createEntrySchema`/
`updateEntrySchema`) whitelists `sort` to the three allowed values and
coerces `page`/`pageSize` to positive integers. `sort` is never used to
build a raw column name — it maps through a fixed lookup object, so an
invalid value is a validation error, not a query-builder input.

### Worker service: `EntriesService.getEntries`

Takes the ledger id plus the parsed query object. Builds one shared
`where` clause:

- Always: `eq(entriesTable.ledgerId, ledgerId)`
- If `q`: `and(..., or(like(entriesTable.name, %q%), like(entriesTable.description, %q%), like(user.name, %q%)))`
- If `authorIds`: `and(..., inArray(entriesTable.userId, authorIds))`

`sort`/`order` map through a whitelist (`{ date: entriesTable.createdAt,
amount: entriesTable.amount, name: entriesTable.name }`) to build the
`orderBy`.

Runs two queries against that shared `where`, concurrently
(`Promise.all` — these are independent reads, not a multi-statement write,
so `db.batch` doesn't apply here; see the D1-transaction gotcha in the
root `CLAUDE.md`):

1. Rows: existing `leftJoin(user, ...)` select, `+ orderBy + limit(pageSize)
   + offset((page - 1) * pageSize)`.
2. Count: `select({ count: count() })` over the same joined tables and
   `where`, no order/limit.

`totalPages = Math.ceil(total / pageSize)` (0 when `total` is 0).

`pageSize` is accepted by the API (useful for testing pagination math
directly) but the UI never sends anything other than the default — there
is no page-size selector control; 20 is fixed on the frontend.

A new Drizzle index on `(ledgerId, createdAt)` is added via `bun run
db:gen` (composite index covering the always-present ledger scope plus the
default sort column) so the common case — no filters, sorted by date —
stays an index scan rather than a full table scan as ledgers grow. Per the
root `CLAUDE.md` gotcha, the generated migration is checked for the
`PRAGMA foreign_keys=OFF` / rebuild-selects-nonexistent-column issue before
applying — a plain `CREATE INDEX` normally generates cleanly, but it gets
verified, not assumed.

### Frontend: URL-driven query state

`$ledgerId/index.tsx`'s route gets a `validateSearch` (zod schema)
covering `q`/`sort`/`order`/`authorIds`/`page`, matching the worker's
query schema. Changing `q`, `sort`, `order`, or `authorIds` resets `page`
to 1 (a new filter/sort combination invalidates whatever page you were on).

`entriesKeys.byLedger(ledgerId, query)` in `app/query-keys.ts` folds the
full query object into the cache key, so every distinct filter/sort/page
combination the user visits is cached independently and re-served
instantly (no refetch) if revisited within `staleTime` — this falls out of
TanStack Query's normal per-key caching, no extra plumbing required.

Two additions on top of that baseline caching, both scoped to the entries
query:

- **`placeholderData: keepPreviousData`** on the `useQuery` call — moving
  between pages (or changing sort/filter) keeps showing the previous
  result set while the new one loads, instead of dropping to the
  `Skeleton` fallback. The loading state becomes a subtle
  (e.g. reduced-opacity) affordance on the existing table rather than a
  full replace.
- **Next-page prefetch**: once the current page's query settles, call
  `queryClient.prefetchQuery` for `page + 1` with the same filters (only
  when `page < totalPages`). Clicking "next" is then usually served from
  cache immediately. No prefetch for "previous" — that page is already
  cached from having been visited to get here.

`getEntries(ledgerId, query)` in `app/apis/entries.ts` builds the query
string from the query object (skipping undefined/empty fields) and returns
`EntriesPage` instead of `Entry[]`.

### `DataTable` (`app/components/data-table.tsx`)

Gets new optional props so it can run in manual (server-driven) mode
without breaking as a plain client-rendered table:

```ts
type DataTableProps<T> = {
    data: T[]
    columns: ColumnDef<T, unknown>[]
    sorting?: SortingState
    onSortingChange?: OnChangeFn<SortingState>
    pagination?: { pageIndex: number; pageSize: number }
    pageCount?: number
    onPageChange?: (pageIndex: number) => void
}
```

When `sorting`/`onSortingChange` are passed, `manualSorting: true` and
`getSortedRowModel` is skipped (the rows arrive pre-sorted from the
server). Same for `pagination`/`pageCount` → `manualPagination: true`.
Pagination controls (prev/next + "page X of Y") render below the table
when `pageCount` is passed.

### Column sorting UI (`app/components/entries/columns.tsx`)

Date, Amount, and Name headers become clickable buttons showing a
sort-direction indicator (reusing `lucide-react`, already a dependency,
for the up/down chevron — consistent with icons already used elsewhere
like `Plus`). Type and Added By headers stay plain text — not sortable,
per the composite-value reasoning already documented in this file's
column comment (a badge/avatar column has no natural sort key).

### Filter bar (new: `app/components/entries/filter-bar.tsx`)

Rendered above `DataTable` in `$ledgerId/index.tsx`. Two controls:

- **Search `Input`**, debounced ~300ms before writing to the `q` search
  param, so typing doesn't fire a request per keystroke. Local state holds
  the raw keystrokes; the debounced value is what reaches `navigate`.
- **Author multi-select**: `DropdownMenu` +
  `DropdownMenuCheckboxItem` per ledger member (from the existing
  `getMembers(ledgerId)` query), toggling membership in the `authorIds`
  search param array. The trigger button shows a count badge when one or
  more authors are selected. No new UI primitive needed — this reuses
  `app/components/ui/dropdown-menu.tsx`, which already exports
  `DropdownMenuCheckboxItem`.

### Testing

Worker (`worker/test/routes/entries.test.ts`, following the existing
route-level `req()` + `signInAs()` pattern):

- `q` matches on name, on description, and on author name independently.
- `authorIds` with one id, with multiple ids, and with an id that has no
  entries (empty `data`, `total: 0`).
- Each of `sort=date|amount|name` in both `order` directions.
- Pagination: `page=1` default, an explicit `page=2` with fewer than
  `pageSize` remaining rows, and a `page` beyond `totalPages` (empty
  `data`, correct `total`/`totalPages` still returned).
- Combining `q` + `authorIds` + `sort` + `page` in one request.
- Existing viewer/member role-gating behavior on this route is unaffected
  (still covered by current tests; no new role logic is introduced).

Frontend: no existing frontend test harness to extend in this repo
(per `worker/CLAUDE.md`, tests are worker-only). Verified manually via
`bun run dev`: type into search, toggle each sort column, select/deselect
multiple authors, page forward and back, and confirm the URL reflects
state and a refresh preserves it.
