# Entries Table Query Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-side search, sorting, multi-author filtering, and paginated fetching to the entries table on `$ledgerId`'s index route, with the query state living in the URL.

**Architecture:** `GET /api/ledgers/:ledgerId/entries` gains `q`/`sort`/`order`/`authorIds`/`page` query params and returns `{ data, page, pageSize, total, totalPages }` instead of a bare array; the worker builds one shared Drizzle `where` clause and runs a rows query and a count query concurrently. The frontend route validates the same shape as typed search params (`validateSearch`), and `DataTable` gets optional manual-sorting/manual-pagination props so react-table renders server-driven state instead of computing its own.

**Tech Stack:** Hono + Drizzle (D1/SQLite) on the worker; TanStack Router (typed search params) + TanStack Query (`keepPreviousData`, `prefetchQuery`) + TanStack Table (manual sorting/pagination) on the frontend; zod for both the worker's query validation and the route's `validateSearch`; Vitest (`@cloudflare/vitest-pool-workers`) for worker tests.

**Spec:** `docs/superpowers/specs/2026-08-24-entries-table-query-design.md`

## Global Constraints

- Default page size is **20**, fixed on the frontend (no page-size selector); the worker accepts `pageSize` as a query param anyway, for testing.
- Search (`q`) matches entry `name`, `description`, and author `name` (case-sensitive `LIKE`, per SQLite's default collation — matches the existing codebase's use of plain `like()` elsewhere).
- Sortable columns are exactly `date` (→ `createdAt`), `amount`, `name` — no others.
- The author filter's option list is every ledger member (`getMembers`), not just members who already have entries.
- `sort` is never interpolated as a raw column name — it maps through a fixed whitelist object server-side.
- Changing `q`, `sort`, `order`, or `authorIds` always resets `page` to 1.
- `db.transaction()` does not work on D1 — this plan never needs it (the two entries queries are independent reads run concurrently via `Promise.all`, not a multi-statement write).
- Every worker text-column select schema must list explicit per-column zod overrides (the `drizzle-zod` 0.8.3 / zod 4.4.3 `Buffer`/`any` inference bug) — not new here, but don't drop the existing overrides in `selectEntriesSchema` while editing `worker/database/schemas/entries.ts`.
- Any generated migration must be hand-checked before applying: D1 rejects `PRAGMA foreign_keys=OFF` and rebuild-selects-nonexistent-column patterns that `drizzle-kit` sometimes emits for NOT NULL columns or new foreign keys. A plain `CREATE INDEX` (this plan's only schema change) is not expected to hit this, but verify the generated SQL before applying regardless.
- Formatting is Biome (4-space indent, single quotes, no semicolons, no trailing commas) via the pre-commit hook — don't fight it, let `lint-staged` reformat on commit.

---

## Task 1: Worker query schema, sort/order types, and composite index

**Files:**
- Modify: `worker/database/schemas/entries.ts`

**Interfaces:**
- Produces: `ENTRIES_SORT_FIELDS` (`readonly ['date', 'amount', 'name']`), `EntriesSort` (`'date' | 'amount' | 'name'`), `ENTRIES_ORDER` (`readonly ['asc', 'desc']`), `EntriesOrder` (`'asc' | 'desc'`), `entriesQuerySchema` (zod object), `EntriesQuery = z.infer<typeof entriesQuerySchema>` — all exported from `worker/database/schemas/entries.ts` (and re-exported via `worker/database/schemas/index.ts`'s existing `export * from './entries'`). A new composite index `entries_ledger_id_created_at_index` on `(ledger_id, created_at)`.

- [ ] **Step 1: Add the sort/order constants and query schema**

In `worker/database/schemas/entries.ts`, add after the existing `ENTRY_TYPES`/`entryTypeFor` block (after line 24):

```ts
export const ENTRIES_SORT_FIELDS = ['date', 'amount', 'name'] as const
export type EntriesSort = (typeof ENTRIES_SORT_FIELDS)[number]

export const ENTRIES_ORDER = ['asc', 'desc'] as const
export type EntriesOrder = (typeof ENTRIES_ORDER)[number]
```

Then, at the end of the file (after `selectEntriesSchema`), add:

```ts
// TanStack Router's default search-param serialization JSON-encodes any
// non-primitive value, so an array search param arrives here as a JSON
// string (e.g. `authorIds=%5B%22a%22%2C%22b%22%5D`), not as a repeated
// query key. This preprocessor undoes that before zod sees it.
const authorIdsParam = z.preprocess(value => {
    if (typeof value !== 'string' || value.length === 0) {
        return undefined
    }

    try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : undefined
    } catch {
        return undefined
    }
}, z.array(z.string()).optional())

export const entriesQuerySchema = z.object({
    q: z.string().trim().min(1).optional(),
    sort: z.enum(ENTRIES_SORT_FIELDS).optional().default('date'),
    order: z.enum(ENTRIES_ORDER).optional().default('desc'),
    authorIds: authorIdsParam,
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce
        .number()
        .int()
        .positive()
        .max(100)
        .optional()
        .default(20)
})
export type EntriesQuery = z.infer<typeof entriesQuerySchema>
```

- [ ] **Step 2: Add the composite index**

In the same file, change the table's index array (currently lines 56-59):

```ts
    table => [
        index('entries_id_index').on(table.id),
        index('entries_ledger_id_index').on(table.ledgerId)
    ]
)
```

to:

```ts
    table => [
        index('entries_id_index').on(table.id),
        index('entries_ledger_id_index').on(table.ledgerId),
        index('entries_ledger_id_created_at_index').on(
            table.ledgerId,
            table.createdAt
        )
    ]
)
```

- [ ] **Step 3: Typecheck**

Run: `bun run build`
Expected: succeeds (this only adds new exports and a schema-level index; nothing consumes them yet).

- [ ] **Step 4: Generate the migration**

Run: `bun run db:gen`

Expected: a new file appears in `.migrations/`, e.g. `.migrations/0010_<name>.sql`.

- [ ] **Step 5: Inspect the generated SQL**

Open the new `.migrations/0010_*.sql` file. Expected content is a single statement:

```sql
CREATE INDEX `entries_ledger_id_created_at_index` ON `entries` (`ledger_id`,`created_at`);
```

Per the root `CLAUDE.md` gotcha, confirm the file does **not** contain `PRAGMA foreign_keys=OFF` or a table rebuild — if it does, stop and hand-edit it to just the `CREATE INDEX` statement before continuing (this is not expected for a plain index addition, but is being verified, not assumed).

- [ ] **Step 6: Apply the migration locally**

Run: `bun wrangler d1 migrations apply xpens --local`
Expected: reports the new migration applied successfully.

- [ ] **Step 7: Commit**

```bash
git add worker/database/schemas/entries.ts .migrations/
git commit -m "feat(worker): add the entries query schema and a ledger/date index"
```

---

## Task 2: Worker service and route — search, sort, filter, pagination

**Files:**
- Modify: `worker/services/entries.ts:1-44` (the `getEntries` function)
- Modify: `worker/routes/entries.ts:1-16` (the `GET /` handler)
- Modify: `worker/test/routes/entries.test.ts` (update 3 existing assertions that assume a bare-array response; add new coverage)

**Interfaces:**
- Consumes: `entriesQuerySchema`, `EntriesQuery` from Task 1 (`worker/database/schemas/entries.ts`, re-exported via `@/database/schemas`).
- Produces: `EntriesService.getEntries(ledgerId: string, query: EntriesQuery): Promise<{ data: (typeof entriesTable.$inferSelect & { authorName: string | null; authorImage: string | null })[]; page: number; pageSize: number; total: number; totalPages: number }>`. `GET /api/ledgers/:ledgerId/entries?q=&sort=&order=&authorIds=&page=` now returns that same shape as JSON.

- [ ] **Step 1: Update the two existing tests that assume a bare-array response**

In `worker/test/routes/entries.test.ts`, the `'ordered by createdAt desc'` test (currently lines 87-111) parses the response directly as an array. Change:

```ts
        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/entries`)
        const entries = (await res.json()) as { name: string }[]

        expect(entries[0]?.name).toBe('Second')
        expect(entries[1]?.name).toBe('First')
    })
```

to:

```ts
        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/entries`)
        const body = (await res.json()) as { data: { name: string }[] }

        expect(body.data[0]?.name).toBe('Second')
        expect(body.data[1]?.name).toBe('First')
    })
```

Then, in the `'entry author is joined into the list response'` describe block (currently lines 213-275), both tests parse the response the same bare-array way. In `'the list carries the author name and image'`, change:

```ts
        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/entries`)
        const entries = (await res.json()) as {
            userId: string | null
            authorName: string | null
            authorImage: string | null
        }[]

        expect(entries).toHaveLength(1)
        expect(entries[0]?.userId).toBe(owner.id)
        expect(entries[0]?.authorName).toBe('Ada Lovelace')
        expect(entries[0]?.authorImage).toBe('https://example.com/ada.png')
    })
```

to:

```ts
        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/entries`)
        const body = (await res.json()) as {
            data: {
                userId: string | null
                authorName: string | null
                authorImage: string | null
            }[]
        }

        expect(body.data).toHaveLength(1)
        expect(body.data[0]?.userId).toBe(owner.id)
        expect(body.data[0]?.authorName).toBe('Ada Lovelace')
        expect(body.data[0]?.authorImage).toBe('https://example.com/ada.png')
    })
```

And in `'an entry whose author was deleted is still listed, with a null author'`, change:

```ts
        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/entries`)
        const entries = (await res.json()) as {
            name: string
            userId: string | null
            authorName: string | null
        }[]

        expect(entries).toHaveLength(1)
        expect(entries[0]?.name).toBe('Orphaned')
        expect(entries[0]?.userId).toBeNull()
        expect(entries[0]?.authorName).toBeNull()
    })
```

to:

```ts
        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/entries`)
        const body = (await res.json()) as {
            data: {
                name: string
                userId: string | null
                authorName: string | null
            }[]
        }

        expect(body.data).toHaveLength(1)
        expect(body.data[0]?.name).toBe('Orphaned')
        expect(body.data[0]?.userId).toBeNull()
        expect(body.data[0]?.authorName).toBeNull()
    })
```

- [ ] **Step 2: Add the new query-behavior tests**

In `worker/test/routes/entries.test.ts`, add this new `describe` block at the end of the file:

```ts
describe('GET /api/ledgers/:ledgerId/entries — search, sort, filter, pagination', () => {
    test('q matches the entry name', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Coffee run', amount: -5 })
        })
        await signInAs(owner)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Groceries', amount: -40 })
        })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/entries?q=coffee`)
        const body = (await res.json()) as {
            data: { name: string }[]
            total: number
        }

        expect(body.total).toBe(1)
        expect(body.data[0]?.name).toBe('Coffee run')
    })

    test('q matches the entry description', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        await signInAs(owner)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                name: 'Utility',
                description: 'March electricity bill',
                amount: -60
            })
        })
        await signInAs(owner)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Other', amount: -10 })
        })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/entries?q=electricity`)
        const body = (await res.json()) as {
            data: { name: string }[]
            total: number
        }

        expect(body.total).toBe(1)
        expect(body.data[0]?.name).toBe('Utility')
    })

    test('q matches the author name', async () => {
        const owner = await createUser({ name: 'Ada Lovelace' })
        const other = await createUser({ name: 'Grace Hopper' })
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: other.id, role: 'member' }]
        })

        await signInAs(owner)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Owner entry', amount: -1 })
        })
        await signInAs(other)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Member entry', amount: -2 })
        })

        await signInAs(owner)
        const res = await req(`/api/ledgers/${ledgerId}/entries?q=Hopper`)
        const body = (await res.json()) as {
            data: { name: string }[]
            total: number
        }

        expect(body.total).toBe(1)
        expect(body.data[0]?.name).toBe('Member entry')
    })

    test('authorIds filters to the selected members, and an id with no entries returns empty', async () => {
        const owner = await createUser()
        const author = await createUser()
        const bystander = await createUser()
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [
                { userId: author.id, role: 'member' },
                { userId: bystander.id, role: 'member' }
            ]
        })

        await signInAs(author)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Author entry', amount: -3 })
        })
        await signInAs(owner)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Owner entry', amount: -4 })
        })

        await signInAs(owner)
        const filtered = await req(
            `/api/ledgers/${ledgerId}/entries?authorIds=${encodeURIComponent(
                JSON.stringify([author.id])
            )}`
        )
        const filteredBody = (await filtered.json()) as {
            data: { name: string }[]
            total: number
        }
        expect(filteredBody.total).toBe(1)
        expect(filteredBody.data[0]?.name).toBe('Author entry')

        await signInAs(owner)
        const empty = await req(
            `/api/ledgers/${ledgerId}/entries?authorIds=${encodeURIComponent(
                JSON.stringify([bystander.id])
            )}`
        )
        const emptyBody = (await empty.json()) as {
            data: unknown[]
            total: number
        }
        expect(emptyBody.total).toBe(0)
        expect(emptyBody.data).toHaveLength(0)
    })

    test('sort=amount orders ascending and descending', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        for (const amount of [-30, -10, -20]) {
            await signInAs(owner)
            await req(`/api/ledgers/${ledgerId}/entries`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ name: `Entry ${amount}`, amount })
            })
        }

        await signInAs(owner)
        const asc = await req(
            `/api/ledgers/${ledgerId}/entries?sort=amount&order=asc`
        )
        const ascBody = (await asc.json()) as { data: { amount: number }[] }
        expect(ascBody.data.map(entry => entry.amount)).toEqual([
            -30, -20, -10
        ])

        await signInAs(owner)
        const desc = await req(
            `/api/ledgers/${ledgerId}/entries?sort=amount&order=desc`
        )
        const descBody = (await desc.json()) as { data: { amount: number }[] }
        expect(descBody.data.map(entry => entry.amount)).toEqual([
            -10, -20, -30
        ])
    })

    test('sort=name orders alphabetically', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        for (const name of ['Zebra', 'Apple', 'Mango']) {
            await signInAs(owner)
            await req(`/api/ledgers/${ledgerId}/entries`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ name, amount: -1 })
            })
        }

        await signInAs(owner)
        const res = await req(
            `/api/ledgers/${ledgerId}/entries?sort=name&order=asc`
        )
        const body = (await res.json()) as { data: { name: string }[] }
        expect(body.data.map(entry => entry.name)).toEqual([
            'Apple',
            'Mango',
            'Zebra'
        ])
    })

    test('pagination returns the requested page and correct metadata', async () => {
        const owner = await createUser()
        const ledgerId = await createLedger({ owner: owner.id })

        for (let i = 0; i < 25; i++) {
            await signInAs(owner)
            await req(`/api/ledgers/${ledgerId}/entries`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ name: `Entry ${i}`, amount: -1 })
            })
        }

        await signInAs(owner)
        const page1 = await req(`/api/ledgers/${ledgerId}/entries`)
        const page1Body = (await page1.json()) as {
            data: unknown[]
            page: number
            pageSize: number
            total: number
            totalPages: number
        }
        expect(page1Body.data).toHaveLength(20)
        expect(page1Body.page).toBe(1)
        expect(page1Body.pageSize).toBe(20)
        expect(page1Body.total).toBe(25)
        expect(page1Body.totalPages).toBe(2)

        await signInAs(owner)
        const page2 = await req(`/api/ledgers/${ledgerId}/entries?page=2`)
        const page2Body = (await page2.json()) as { data: unknown[] }
        expect(page2Body.data).toHaveLength(5)

        await signInAs(owner)
        const page3 = await req(`/api/ledgers/${ledgerId}/entries?page=3`)
        const page3Body = (await page3.json()) as {
            data: unknown[]
            total: number
        }
        expect(page3Body.data).toHaveLength(0)
        expect(page3Body.total).toBe(25)
    })

    test('combining q, authorIds, sort and page narrows correctly', async () => {
        const owner = await createUser()
        const author = await createUser()
        const ledgerId = await createLedger({
            owner: owner.id,
            members: [{ userId: author.id, role: 'member' }]
        })

        await signInAs(author)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Team lunch', amount: -20 })
        })
        await signInAs(author)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Team dinner', amount: -40 })
        })
        await signInAs(owner)
        await req(`/api/ledgers/${ledgerId}/entries`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Team snacks', amount: -5 })
        })

        await signInAs(owner)
        const res = await req(
            `/api/ledgers/${ledgerId}/entries?q=team&authorIds=${encodeURIComponent(
                JSON.stringify([author.id])
            )}&sort=amount&order=desc&page=1`
        )
        const body = (await res.json()) as {
            data: { name: string }[]
            total: number
        }

        expect(body.total).toBe(2)
        expect(body.data.map(entry => entry.name)).toEqual([
            'Team lunch',
            'Team dinner'
        ])
    })
})
```

- [ ] **Step 3: Run the tests to confirm they fail for the right reason**

Run: `bun run test -- entries`
Expected: FAIL — the updated/new tests expect `{ data: [...] }` but the route still returns a bare array (or, for the new query-param tests, ignores `q`/`sort`/`authorIds`/`page` entirely).

- [ ] **Step 4: Implement the service**

Replace `getEntries` in `worker/services/entries.ts` (currently lines 14-44):

```ts
import { and, asc, count, desc, eq, inArray, like, or, type SQL } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import type { z } from 'zod'
import { db } from '@/database/db'
import {
    type createEntrySchema,
    type EntriesQuery,
    entriesTable,
    entryTypeFor,
    type updateEntrySchema,
    user
} from '@/database/schemas'
import * as HTTPStatus from '@/status-codes'

const SORT_COLUMNS = {
    date: entriesTable.createdAt,
    amount: entriesTable.amount,
    name: entriesTable.name
} as const

export async function getEntries(ledgerId: string, query: EntriesQuery) {
    try {
        // Membership was already proven by requireLedgerRole, so the join
        // below is purely for display and search — it is not an
        // authorization check. It must stay a `leftJoin`: `userId` is
        // nullable on purpose, and an inner join would silently drop
        // entries whose author was deleted.
        const conditions: (SQL | undefined)[] = [
            eq(entriesTable.ledgerId, ledgerId)
        ]

        if (query.q) {
            const pattern = `%${query.q}%`
            conditions.push(
                or(
                    like(entriesTable.name, pattern),
                    like(entriesTable.description, pattern),
                    like(user.name, pattern)
                )
            )
        }

        if (query.authorIds && query.authorIds.length > 0) {
            conditions.push(inArray(entriesTable.userId, query.authorIds))
        }

        const whereClause = and(...conditions)
        const orderFn = query.order === 'asc' ? asc : desc
        const orderBy = orderFn(SORT_COLUMNS[query.sort])

        const rowsQuery = db
            .select({
                id: entriesTable.id,
                name: entriesTable.name,
                description: entriesTable.description,
                amount: entriesTable.amount,
                type: entriesTable.type,
                userId: entriesTable.userId,
                ledgerId: entriesTable.ledgerId,
                createdAt: entriesTable.createdAt,
                updatedAt: entriesTable.updatedAt,
                authorName: user.name,
                authorImage: user.image
            })
            .from(entriesTable)
            .leftJoin(user, eq(entriesTable.userId, user.id))
            .where(whereClause)
            .orderBy(orderBy)
            .limit(query.pageSize)
            .offset((query.page - 1) * query.pageSize)

        const countQuery = db
            .select({ value: count() })
            .from(entriesTable)
            .leftJoin(user, eq(entriesTable.userId, user.id))
            .where(whereClause)

        const [data, countResult] = await Promise.all([rowsQuery, countQuery])
        const total = countResult[0]?.value ?? 0

        return {
            data,
            page: query.page,
            pageSize: query.pageSize,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize)
        }
    } catch (error) {
        throw new HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, {
            cause: error,
            message: 'Unable to fetch entries'
        })
    }
}
```

Leave `create`, `getEntry`, `update`, `remove` in this file untouched.

- [ ] **Step 5: Wire the route**

In `worker/routes/entries.ts`, change the import (line 2):

```ts
import { createEntrySchema, updateEntrySchema } from '@/database/schemas'
```

to:

```ts
import {
    createEntrySchema,
    entriesQuerySchema,
    updateEntrySchema
} from '@/database/schemas'
```

Then change the `GET /` handler (currently lines 14-16):

```ts
    .get('/', requireLedgerRole('viewer'), async ctx => {
        return ctx.json(await EntriesService.getEntries(ctx.get('ledgerId')))
    })
```

to:

```ts
    .get(
        '/',
        requireLedgerRole('viewer'),
        validate('query', entriesQuerySchema),
        async ctx => {
            return ctx.json(
                await EntriesService.getEntries(
                    ctx.get('ledgerId'),
                    ctx.req.valid('query')
                )
            )
        }
    )
```

- [ ] **Step 6: Run the tests again to confirm they pass**

Run: `bun run test -- entries`
Expected: PASS — all tests in `worker/test/routes/entries.test.ts` green.

- [ ] **Step 7: Run the full worker test suite and typecheck**

Run: `bun run test`
Expected: PASS, no other suite regressed.

Run: `bun run build`
Expected: succeeds.

- [ ] **Step 8: Commit**

```bash
git add worker/services/entries.ts worker/routes/entries.ts worker/test/routes/entries.test.ts
git commit -m "feat(worker): support search, sort, author filter and pagination on GET entries"
```

---

## Task 3: Frontend types, query keys, API layer, and minimal route adaptation

**Files:**
- Modify: `app/types.ts`
- Modify: `app/query-keys.ts`
- Modify: `app/apis/entries.ts`
- Modify: `app/routes/_dashboard/ledgers/$ledgerId/index.tsx`

**Interfaces:**
- Consumes: worker's `EntriesSort`/`EntriesOrder` types (Task 1), the `{ data, page, pageSize, total, totalPages }` response shape (Task 2).
- Produces: `EntriesQuery` and `EntriesPage` types (`app/types.ts`); `entriesKeys.byLedger(ledgerId: string, query: EntriesQuery)` (`app/query-keys.ts`); `getEntries(ledgerId: string, query: EntriesQuery): Promise<EntriesPage>` (`app/apis/entries.ts`).

This task lands the plumbing with no visible UI change — the entries page keeps working exactly as before (first 20 entries, sorted by date desc), just via the new response shape. There's no frontend test harness in this repo (per `worker/CLAUDE.md`), so verification here is `bun run build` + a manual check that the page still loads.

- [ ] **Step 1: Add the `EntriesQuery`/`EntriesPage` types**

In `app/types.ts`, change the import on line 2:

```ts
import type { selectEntriesSchema } from '../worker/database/schemas/entries'
```

to:

```ts
import type {
    EntriesOrder,
    EntriesSort,
    selectEntriesSchema
} from '../worker/database/schemas/entries'
```

Then, after the existing `EntryPayload` type (after line 31), add:

```ts
export type { EntriesOrder, EntriesSort }

export type EntriesQuery = {
    q?: string
    sort?: EntriesSort
    order?: EntriesOrder
    authorIds?: string[]
    page?: number
}

export type EntriesPage = {
    data: Entry[]
    page: number
    pageSize: number
    total: number
    totalPages: number
}
```

- [ ] **Step 2: Fold the query into the entries cache key**

In `app/query-keys.ts`, add the import at the top:

```ts
import type { EntriesQuery } from '@/types'
```

Then change:

```ts
export const entriesKeys = {
    all: ['ENTRIES'] as const,
    byLedger: (ledgerId: string) => ['ENTRIES', ledgerId] as const
}
```

to:

```ts
export const entriesKeys = {
    all: ['ENTRIES'] as const,
    byLedger: (ledgerId: string, query: EntriesQuery) =>
        ['ENTRIES', ledgerId, query] as const
}
```

- [ ] **Step 3: Update the API wrapper**

In `app/apis/entries.ts`, change the top import and `getEntries`:

```ts
import { json, request } from '@/apis/http'
import type { Entry, EntryPayload, EntryRow } from '@/types'

export async function getEntries(ledgerId: string) {
    return await request<Entry[]>(`/api/ledgers/${ledgerId}/entries`)
}
```

to:

```ts
import { json, request } from '@/apis/http'
import type { EntriesPage, EntriesQuery, EntryPayload, EntryRow } from '@/types'

function buildEntriesQueryString(query: EntriesQuery) {
    const params = new URLSearchParams()

    if (query.q) params.set('q', query.q)
    if (query.sort) params.set('sort', query.sort)
    if (query.order) params.set('order', query.order)
    if (query.authorIds && query.authorIds.length > 0) {
        params.set('authorIds', JSON.stringify(query.authorIds))
    }
    if (query.page) params.set('page', String(query.page))

    const search = params.toString()
    return search ? `?${search}` : ''
}

export async function getEntries(ledgerId: string, query: EntriesQuery) {
    return await request<EntriesPage>(
        `/api/ledgers/${ledgerId}/entries${buildEntriesQueryString(query)}`
    )
}
```

Leave `createEntry`, `updateEntry`, `removeEntry` untouched.

- [ ] **Step 4: Adapt the route to the new response shape**

In `app/routes/_dashboard/ledgers/$ledgerId/index.tsx`, change the query call (currently lines 28-31):

```ts
    const entries = useQuery({
        queryKey: entriesKeys.byLedger(ledgerId),
        queryFn: () => getEntries(ledgerId)
    })
```

to:

```ts
    const entries = useQuery({
        queryKey: entriesKeys.byLedger(ledgerId, {}),
        queryFn: () => getEntries(ledgerId, {})
    })
```

And change the `DataTable` usage (currently lines 64-67):

```ts
                <DataTable
                    data={entries.data}
                    columns={createColumns(ledgerId, role)}
                />
```

to:

```ts
                <DataTable
                    data={entries.data.data}
                    columns={createColumns(ledgerId, role)}
                />
```

- [ ] **Step 5: Typecheck**

Run: `bun run build`
Expected: succeeds.

- [ ] **Step 6: Manual verification**

Run: `bun run dev`. Navigate to a ledger's entries page. Expected: the table renders exactly as before (up to the first 20 entries, newest first), create/edit/delete still work.

- [ ] **Step 7: Commit**

```bash
git add app/types.ts app/query-keys.ts app/apis/entries.ts app/routes/_dashboard/ledgers/\$ledgerId/index.tsx
git commit -m "feat(app): adapt entries fetching to the paginated query response"
```

---

## Task 4: Sortable columns

**Files:**
- Modify: `app/components/data-table.tsx`
- Modify: `app/components/entries/columns.tsx`
- Modify: `app/routes/_dashboard/ledgers/$ledgerId/index.tsx`

**Interfaces:**
- Consumes: `getEntries`/`entriesKeys`/`EntriesQuery` from Task 3.
- Produces: `DataTable`'s `sorting?: SortingState` / `onSortingChange?: OnChangeFn<SortingState>` props; `SORT_COLUMN_IDS: Record<EntriesSort, string>` and `SORT_FIELDS_BY_COLUMN_ID: Record<string, EntriesSort>` (`app/components/entries/columns.tsx`) — later tasks (5, 6) rely on these two maps and on `DataTable`'s prop names.

- [ ] **Step 1: Add manual-sorting support to `DataTable`**

Replace the full contents of `app/components/data-table.tsx`:

```tsx
import type {
    ColumnDef,
    OnChangeFn,
    SortingState
} from '@tanstack/react-table'
import {
    flexRender,
    getCoreRowModel,
    useReactTable
} from '@tanstack/react-table'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'

export type DataTableProps<T extends Record<string, unknown>> = {
    data: T[]
    columns: ColumnDef<T, unknown>[]
    sorting?: SortingState
    onSortingChange?: OnChangeFn<SortingState>
}

export function DataTable<T extends Record<string, unknown>>({
    data,
    columns,
    sorting,
    onSortingChange
}: DataTableProps<T>) {
    'use no memo'

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualSorting: sorting !== undefined,
        state: {
            ...(sorting !== undefined && { sorting })
        },
        onSortingChange
    })

    const contents = table.getRowModel().rows.map(row => (
        <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
            {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
            ))}
        </TableRow>
    ))

    const contentNotFound = (
        <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
            </TableCell>
        </TableRow>
    )

    const header = table.getHeaderGroups().map(group => (
        <TableRow key={group.id}>
            {group.headers.map(heading => (
                <TableHead key={heading.id}>
                    {heading.isPlaceholder
                        ? null
                        : flexRender(
                              heading.column.columnDef.header,
                              heading.getContext()
                          )}
                </TableHead>
            ))}
        </TableRow>
    ))

    return (
        <div className="overflow-hidden rounded-md border">
            <Table>
                <TableHeader>{header}</TableHeader>
                <TableBody>
                    {table.getRowModel().rows.length
                        ? contents
                        : contentNotFound}
                </TableBody>
            </Table>
        </div>
    )
}
```

(Only the `DataTableProps` type and the `useReactTable` call change from the original; the render logic below is unchanged.)

- [ ] **Step 2: Make Date/Amount/Name headers sortable**

Replace the full contents of `app/components/entries/columns.tsx`:

```tsx
import type { Column, ColumnDef } from '@tanstack/react-table'
import { createColumnHelper } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LedgerRole } from '@/lib/roles'
import { hasRole } from '@/lib/roles'
import type { Entry, EntriesSort } from '@/types'

import AuthorAvatar from './author-avatar'
import TableActions from './table-actions'
import EntryTypeBadge from './type-badge'

const columnHelper = createColumnHelper<Entry>()

// The table only understands react-table column ids; these two maps keep
// that id in sync with the `sort` search param the worker's query schema
// accepts (see worker/database/schemas/entries.ts's ENTRIES_SORT_FIELDS).
export const SORT_COLUMN_IDS: Record<EntriesSort, string> = {
    date: 'createdAt',
    amount: 'amount',
    name: 'name'
}

export const SORT_FIELDS_BY_COLUMN_ID: Record<string, EntriesSort> = {
    createdAt: 'date',
    amount: 'amount',
    name: 'name'
}

// The sign of `amount` now carries meaning (it is what `type` derives from),
// so a raw `-250` beside a red badge reads as a rendering bug.
const currency = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
})

const parseDate = (input: Date) => {
    const date = new Date(input)
    return Intl.DateTimeFormat('en-PH', {
        dateStyle: 'medium'
    }).format(date)
}

function SortableHeader({
    column,
    label
}: {
    column: Column<Entry, unknown>
    label: string
}) {
    const sorted = column.getIsSorted()

    return (
        <Button
            variant="ghost"
            size="sm"
            className="-ml-2.5"
            onClick={column.getToggleSortingHandler()}
        >
            {label}
            {sorted === 'asc' ? (
                <ArrowUp className="size-3.5" />
            ) : sorted === 'desc' ? (
                <ArrowDown className="size-3.5" />
            ) : (
                <ChevronsUpDown className="size-3.5" />
            )}
        </Button>
    )
}

// A function rather than a constant so the row menu can be dropped entirely for
// viewers. DataTable takes columns as a prop and is marked 'use no memo', so
// rebuilding per render matches what the table already does.
export function createColumns(ledgerId: string, role: LedgerRole) {
    const columns = [
        columnHelper.accessor('name', {
            header: ({ column }) => (
                <SortableHeader column={column} label="Name" />
            )
        }),
        columnHelper.accessor('description', {
            header: 'Description',
            cell: ({ row }) => <span>{row.original.description ?? '—'}</span>
        }),
        columnHelper.accessor('amount', {
            header: ({ column }) => (
                <SortableHeader column={column} label="Amount" />
            ),
            cell: ({ row }) => (
                <span>{currency.format(row.original.amount)}</span>
            )
        }),
        columnHelper.accessor('type', {
            header: 'Type',
            cell: ({ row }) => <EntryTypeBadge type={row.original.type} />
        }),
        columnHelper.accessor('createdAt', {
            header: ({ column }) => (
                <SortableHeader column={column} label="Date Created" />
            ),
            cell: ({ row }) => <span>{parseDate(row.original.createdAt)}</span>
        }),
        columnHelper.accessor('authorName', {
            header: 'Added By',
            cell: ({ row }) => (
                <AuthorAvatar
                    name={row.original.authorName}
                    image={row.original.authorImage}
                />
            )
        })
    ]

    if (hasRole(role, 'member')) {
        columns.push(
            columnHelper.display({
                id: 'action',
                cell: context => (
                    <TableActions context={context} ledgerId={ledgerId} />
                )
            }) as (typeof columns)[number]
        )
    }

    return columns as ColumnDef<Entry, unknown>[]
}
```

- [ ] **Step 3: Add URL-driven sort state to the route**

In `app/routes/_dashboard/ledgers/$ledgerId/index.tsx`, replace the full file contents:

```tsx
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { OnChangeFn, SortingState } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { z } from 'zod'
import { getEntries } from '@/apis/entries'
import { getLedger } from '@/apis/ledgers'
import { DataTable } from '@/components/data-table'
import { entryHandler } from '@/components/dialog-handlers'
import {
    createColumns,
    SORT_COLUMN_IDS,
    SORT_FIELDS_BY_COLUMN_ID
} from '@/components/entries/columns'
import EntryFormDialog from '@/components/entries/dialog'
import DialogConfirmation from '@/components/entries/dialog-confirmation'
import RoleGate from '@/components/role-gate'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { EntriesQuery } from '@/types'
import { entriesKeys, ledgersKeys } from '@/query-keys'

export const Route = createFileRoute('/_dashboard/ledgers/$ledgerId/')({
    validateSearch: z.object({
        q: z.string().optional(),
        sort: z.enum(['date', 'amount', 'name']).optional().default('date'),
        order: z.enum(['asc', 'desc']).optional().default('desc'),
        authorIds: z.array(z.string()).optional(),
        page: z.number().int().positive().optional().default(1)
    }),
    component: EntriesPage
})

function EntriesPage() {
    const { ledgerId } = Route.useParams()
    const search = Route.useSearch()
    const navigate = useNavigate({ from: Route.fullPath })

    const { data: ledger } = useQuery({
        queryKey: ledgersKeys.detail(ledgerId),
        queryFn: () => getLedger(ledgerId)
    })

    const query: EntriesQuery = {
        q: search.q,
        sort: search.sort,
        order: search.order,
        authorIds: search.authorIds,
        page: search.page
    }

    const entries = useQuery({
        queryKey: entriesKeys.byLedger(ledgerId, query),
        queryFn: () => getEntries(ledgerId, query)
    })

    const role = ledger?.role

    const sorting: SortingState = [
        {
            id: SORT_COLUMN_IDS[search.sort],
            desc: search.order === 'desc'
        }
    ]

    const handleSortingChange: OnChangeFn<SortingState> = updater => {
        const next = typeof updater === 'function' ? updater(sorting) : updater
        const first = next[0]

        navigate({
            search: prev => ({
                ...prev,
                sort: first ? SORT_FIELDS_BY_COLUMN_ID[first.id] : 'date',
                order: first ? (first.desc ? 'desc' : 'asc') : 'desc',
                page: 1
            })
        })
    }

    return (
        <div className="space-y-5">
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

            {entries.isPending || !role ? (
                <Skeleton className="h-64" />
            ) : entries.isError ? (
                <p className="text-destructive text-sm">
                    {entries.error.message}
                </p>
            ) : (
                <DataTable
                    data={entries.data.data}
                    columns={createColumns(ledgerId, role)}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                />
            )}
        </div>
    )
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `bun run build`
Expected: succeeds.

Run: `bun run lint`
Expected: no new errors.

- [ ] **Step 5: Manual verification**

Run: `bun run dev`. On a ledger's entries page: click the "Name" header — the URL gains `?sort=name&order=asc`, the table re-fetches and re-renders sorted by name. Click it again — `order` flips to `desc`. Click "Amount" then "Date Created" — each takes over as the active sort. Refresh the page — the sort persists (from the URL).

- [ ] **Step 6: Commit**

```bash
git add app/components/data-table.tsx app/components/entries/columns.tsx app/routes/_dashboard/ledgers/\$ledgerId/index.tsx
git commit -m "feat(app): add sortable Date/Amount/Name headers to the entries table"
```

---

## Task 5: Server-side pagination with smooth transitions

**Files:**
- Modify: `app/components/data-table.tsx`
- Modify: `app/routes/_dashboard/ledgers/$ledgerId/index.tsx`

**Interfaces:**
- Consumes: `DataTable`'s `sorting`/`onSortingChange` and the route's search-param state from Task 4.
- Produces: `DataTable`'s `pagination?: PaginationState` / `pageCount?: number` / `onPageChange?: (pageIndex: number) => void` props.

- [ ] **Step 1: Add manual-pagination support and pager controls to `DataTable`**

Replace the full contents of `app/components/data-table.tsx`:

```tsx
import type {
    ColumnDef,
    OnChangeFn,
    PaginationState,
    SortingState
} from '@tanstack/react-table'
import {
    flexRender,
    getCoreRowModel,
    useReactTable
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'

export type DataTableProps<T extends Record<string, unknown>> = {
    data: T[]
    columns: ColumnDef<T, unknown>[]
    sorting?: SortingState
    onSortingChange?: OnChangeFn<SortingState>
    pagination?: PaginationState
    pageCount?: number
    onPageChange?: (pageIndex: number) => void
}

export function DataTable<T extends Record<string, unknown>>({
    data,
    columns,
    sorting,
    onSortingChange,
    pagination,
    pageCount,
    onPageChange
}: DataTableProps<T>) {
    'use no memo'

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualSorting: sorting !== undefined,
        manualPagination: pagination !== undefined,
        pageCount: pagination !== undefined ? (pageCount ?? -1) : undefined,
        state: {
            ...(sorting !== undefined && { sorting }),
            ...(pagination !== undefined && { pagination })
        },
        onSortingChange
    })

    const contents = table.getRowModel().rows.map(row => (
        <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
            {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
            ))}
        </TableRow>
    ))

    const contentNotFound = (
        <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
            </TableCell>
        </TableRow>
    )

    const header = table.getHeaderGroups().map(group => (
        <TableRow key={group.id}>
            {group.headers.map(heading => (
                <TableHead key={heading.id}>
                    {heading.isPlaceholder
                        ? null
                        : flexRender(
                              heading.column.columnDef.header,
                              heading.getContext()
                          )}
                </TableHead>
            ))}
        </TableRow>
    ))

    return (
        <div className="space-y-3">
            <div className="overflow-hidden rounded-md border">
                <Table>
                    <TableHeader>{header}</TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.length
                            ? contents
                            : contentNotFound}
                    </TableBody>
                </Table>
            </div>

            {pagination && onPageChange && (
                <div className="flex items-center justify-end gap-2">
                    <span className="text-muted-foreground text-sm">
                        Page {pagination.pageIndex + 1} of{' '}
                        {Math.max(pageCount ?? 1, 1)}
                    </span>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        disabled={pagination.pageIndex === 0}
                        onClick={() => onPageChange(pagination.pageIndex - 1)}
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        disabled={
                            pageCount === undefined ||
                            pagination.pageIndex >= pageCount - 1
                        }
                        onClick={() => onPageChange(pagination.pageIndex + 1)}
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            )}
        </div>
    )
}
```

- [ ] **Step 2: Wire pagination, `keepPreviousData`, and next-page prefetch into the route**

In `app/routes/_dashboard/ledgers/$ledgerId/index.tsx`:

Change the imports:

```ts
import { useQuery } from '@tanstack/react-query'
```

to:

```ts
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
```

Add near the top of the file (after the imports, before `export const Route`):

```ts
const PAGE_SIZE = 20
```

Change the component body: after `const navigate = useNavigate({ from: Route.fullPath })`, add:

```ts
    const queryClient = useQueryClient()
```

Change the `entries` query:

```ts
    const entries = useQuery({
        queryKey: entriesKeys.byLedger(ledgerId, query),
        queryFn: () => getEntries(ledgerId, query)
    })
```

to:

```ts
    const entries = useQuery({
        queryKey: entriesKeys.byLedger(ledgerId, query),
        queryFn: () => getEntries(ledgerId, query),
        placeholderData: keepPreviousData
    })
```

After the `entries` query, add the prefetch effect (needs `useEffect` imported from `'react'`):

```ts
    useEffect(() => {
        if (!entries.data || search.page >= entries.data.totalPages) {
            return
        }

        const nextPageQuery: EntriesQuery = { ...query, page: search.page + 1 }
        queryClient.prefetchQuery({
            queryKey: entriesKeys.byLedger(ledgerId, nextPageQuery),
            queryFn: () => getEntries(ledgerId, nextPageQuery)
        })
        // `query` is derived fresh from `search` every render, so it is
        // intentionally excluded — `search.page` (used to build it) is
        // already a dependency, and including the derived object would
        // re-run this effect every render instead of only on real changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entries.data, ledgerId, queryClient, search.page])
```

Add the `useEffect` import — change:

```ts
import { z } from 'zod'
```

to:

```ts
import { useEffect } from 'react'
import { z } from 'zod'
```

Finally, change the `DataTable` usage to pass pagination:

```tsx
                <DataTable
                    data={entries.data.data}
                    columns={createColumns(ledgerId, role)}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                />
```

to:

```tsx
                <DataTable
                    data={entries.data.data}
                    columns={createColumns(ledgerId, role)}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                    pagination={{
                        pageIndex: search.page - 1,
                        pageSize: PAGE_SIZE
                    }}
                    pageCount={entries.data.totalPages}
                    onPageChange={pageIndex =>
                        navigate({
                            search: prev => ({ ...prev, page: pageIndex + 1 })
                        })
                    }
                />
```

- [ ] **Step 3: Typecheck and lint**

Run: `bun run build`
Expected: succeeds.

Run: `bun run lint`
Expected: no new errors.

- [ ] **Step 4: Manual verification**

Run: `bun run dev`. Create at least 21 entries in a ledger (or reuse a ledger that already has that many). On the entries page: confirm "Page 1 of 2" (or more) shows, the previous-page button is disabled on page 1. Click next — the table updates to page 2 without a loading skeleton flash (rows swap in place), the URL gains `?page=2`, and the previous button becomes enabled. Click previous to return to page 1. Refresh mid-page-2 — the page persists from the URL.

- [ ] **Step 5: Commit**

```bash
git add app/components/data-table.tsx app/routes/_dashboard/ledgers/\$ledgerId/index.tsx
git commit -m "feat(app): add server-side pagination with keepPreviousData and next-page prefetch"
```

---

## Task 6: Search and multi-author filter

**Files:**
- Create: `app/hooks/use-debounced-value.ts`
- Create: `app/components/entries/filter-bar.tsx`
- Modify: `app/routes/_dashboard/ledgers/$ledgerId/index.tsx`

**Interfaces:**
- Consumes: the route's search-param state and `DataTable`/`getEntries` wiring from Tasks 4-5; `getMembers` (`app/apis/members.ts`, unmodified) and `LedgerMember` (`app/types.ts`, unmodified).
- Produces: `useDebouncedValue<T>(value: T, delayMs: number): T`; `EntriesFilterBar` component (default export).

- [ ] **Step 1: Add the debounce hook**

Create `app/hooks/use-debounced-value.ts`:

```ts
import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(value: T, delayMs: number) {
    const [debounced, setDebounced] = useState(value)

    useEffect(() => {
        const timeout = setTimeout(() => setDebounced(value), delayMs)
        return () => clearTimeout(timeout)
    }, [value, delayMs])

    return debounced
}
```

- [ ] **Step 2: Add the filter bar component**

Create `app/components/entries/filter-bar.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import type { LedgerMember } from '@/types'

type EntriesFilterBarProps = {
    search: string | undefined
    onSearchChange: (value: string) => void
    members: LedgerMember[]
    authorIds: string[]
    onAuthorIdsChange: (authorIds: string[]) => void
}

export default function EntriesFilterBar({
    search,
    onSearchChange,
    members,
    authorIds,
    onAuthorIdsChange
}: EntriesFilterBarProps) {
    const [inputValue, setInputValue] = useState(search ?? '')
    const debouncedValue = useDebouncedValue(inputValue, 300)

    // The URL is the source of truth (e.g. a browser back/forward nav), so
    // an external `search` change re-syncs the local input.
    useEffect(() => {
        setInputValue(search ?? '')
    }, [search])

    useEffect(() => {
        if (debouncedValue !== (search ?? '')) {
            onSearchChange(debouncedValue)
        }
        // Only the debounced keystroke value should trigger a URL update —
        // `search`/`onSearchChange` are read, not depended on, to avoid
        // re-firing when the URL sync effect above updates `inputValue`.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedValue])

    const toggleAuthor = (userId: string) => {
        onAuthorIdsChange(
            authorIds.includes(userId)
                ? authorIds.filter(id => id !== userId)
                : [...authorIds, userId]
        )
    }

    return (
        <div className="flex items-center gap-2">
            <Input
                value={inputValue}
                onChange={event => setInputValue(event.target.value)}
                placeholder="Search entries..."
                className="max-w-sm"
            />

            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button variant="outline" className="gap-1.5">
                            Author
                            {authorIds.length > 0 && (
                                <span className="rounded-full bg-muted px-1.5 text-xs">
                                    {authorIds.length}
                                </span>
                            )}
                        </Button>
                    }
                />
                <DropdownMenuContent className="min-w-48">
                    {members.map(member => (
                        <DropdownMenuCheckboxItem
                            key={member.id}
                            checked={authorIds.includes(member.userId)}
                            onCheckedChange={() =>
                                toggleAuthor(member.userId)
                            }
                        >
                            {member.name}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
```

- [ ] **Step 3: Wire the filter bar into the route**

In `app/routes/_dashboard/ledgers/$ledgerId/index.tsx`:

Add imports:

```ts
import { getMembers } from '@/apis/members'
import EntriesFilterBar from '@/components/entries/filter-bar'
```

After the existing `ledger` query, add a members query:

```ts
    const { data: members } = useQuery({
        queryKey: ledgersKeys.members(ledgerId),
        queryFn: () => getMembers(ledgerId)
    })
```

Add the filter bar to the JSX, between the header `div` and the `entries.isPending ...` conditional block:

```tsx
            <EntriesFilterBar
                search={search.q}
                onSearchChange={value =>
                    navigate({
                        search: prev => ({
                            ...prev,
                            q: value || undefined,
                            page: 1
                        })
                    })
                }
                members={members ?? []}
                authorIds={search.authorIds ?? []}
                onAuthorIdsChange={authorIds =>
                    navigate({
                        search: prev => ({
                            ...prev,
                            authorIds: authorIds.length ? authorIds : undefined,
                            page: 1
                        })
                    })
                }
            />

```

- [ ] **Step 4: Typecheck and lint**

Run: `bun run build`
Expected: succeeds.

Run: `bun run lint`
Expected: no new errors.

- [ ] **Step 5: Manual verification**

Run: `bun run dev`. On a ledger's entries page: type into the search box — after a brief pause the URL gains `?q=...` and the table filters to matches (name, description, or author name); clear it and the full list returns. Open the "Author" dropdown, select one or more members — the button shows a count badge, the URL gains `?authorIds=[...]`, and the table filters to only those authors' entries; deselecting all removes the param. Combine search, an author filter, a sort, and paging to the second page in one flow, then refresh — every bit of that state survives the refresh from the URL.

- [ ] **Step 6: Final verification**

Run: `bun run test`
Expected: PASS (full worker suite).

Run: `bun run build`
Expected: succeeds.

Run: `bun run lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/hooks/use-debounced-value.ts app/components/entries/filter-bar.tsx app/routes/_dashboard/ledgers/\$ledgerId/index.tsx
git commit -m "feat(app): add debounced search and multi-author filtering to the entries table"
```
