# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"xpens" — a shared expense tracker. Entries live in **ledgers**, which are shared between users through an explicit membership table with roles (viewer / member / admin / owner). React (TanStack Router/Query/Form/Table + Vite) frontend and a Hono API, both deployed as a single Cloudflare Worker (static assets + `/api/*` routed to the worker). Data lives in Cloudflare D1 (SQLite via Drizzle ORM); Cloudflare KV is used as a cache layer. Auth is handled by `better-auth` (Google OAuth + session cookies).

## Commands

Package manager is **bun**.

- `bun dev` — start the Vite dev server (serves both the SPA and the worker via the Cloudflare Vite plugin).
- `bun run build` — typecheck (`tsc -b`) then `vite build`.
- `bun run lint` — ESLint over the whole repo.
- `bun run preview` — build then `vite preview`.
- `bun run deploy` — build then `wrangler deploy`.
- `bun run cf-typegen` — regenerate `worker-configuration.d.ts` from `wrangler.jsonc` bindings.
- `bun run db:gen` — generate a new Drizzle migration from schema changes into `.migrations/` (uses `drizzle.config.ts`; drizzle-kit is only used to generate SQL, not to run it).
- `bun run db:migrate` — apply migrations to the remote D1 database via `wrangler d1 migrations apply xpens`.
- `bun wrangler d1 migrations apply xpens --local` — apply migrations to the local D1 database (needed once after cloning, before `bun dev` works).

There is no test suite configured in this repo. Verification is `bun run build` (which typechecks first), `bun run lint`, and manual flows.

### Gotchas that will cost you an hour

- **`db.transaction()` does not work on D1.** drizzle issues a literal `begin`, which D1 rejects. Every multi-statement operation (ledger creation, invitation accept, ownership transfer, the shell-user insert) uses `db.batch([...])`.
- **drizzle-zod 0.8.3 against zod 4.4.3 infers every `text()` column as `Buffer`/`any` instead of `string`.** All `createSelectSchema` calls therefore pass explicit per-column overrides. If a new text column shows up as `Buffer` downstream, that is why — add the override.
- **drizzle-kit generates migrations that D1 cannot apply** whenever a NOT NULL column or a new foreign key lands on an existing table: it emits `PRAGMA foreign_keys=OFF` (unsupported on D1) and a rebuild that SELECTs the not-yet-existing column. Hand-edit the generated `.sql` — never the snapshot, which already describes the correct end state. See `.migrations/0008_sharp_marten_broadcloak.sql` for the drop-and-recreate shape.

Formatting/linting is enforced by **Biome** (not Prettier/ESLint) via a Husky pre-commit hook running `lint-staged` → `biome check --write`. Indentation is 4 spaces, single quotes, no semicolons, no trailing commas (see `biome.json` / `.prettierrc`). ESLint (`bun run lint`) is a separate, secondary check (React hooks rules, TS recommended rules).

## Architecture

### Single worker, two source trees, one path alias with two meanings

The repo has **two independent root directories that both use the `@/` import alias**, resolved differently depending on which `tsconfig` applies:
- `worker/**` — `@/*` → `./worker/*` (see `tsconfig.worker.json`)
- `app/**` — `@/*` → `./app/*` (see `tsconfig.app.json`)

When editing a file, check which tree you're in before trusting where `@/...` resolves — an import that looks identical resolves to a different file depending on whether it's written under `worker/` or `app/`.

`wrangler.jsonc` treats this as one deployable: static assets are built to `dist/client` and served by the Worker, but any request matching `/api/*` is routed to the worker code first (`run_worker_first`), landing in `worker/index.ts`.

### Worker (`worker/`)

- `worker/index.ts` — Hono app mounted at `/api`, defines the shared `HonoBindings` type (Cloudflare bindings + `user`/`session` context variables) that every route file imports. Route modules (`worker/routes/*.ts`) are plain Hono sub-apps mounted with `app.route('/', route)`.
- `worker/lib/session.ts` — global middleware applied to every `/api/*` request. It calls `better-auth`'s `getSession`, and rejects with 401 unless the path starts with `/api/auth`. Every other route requires a session automatically.
- `worker/lib/ledger-access.ts` — **the authorization layer.** `requireLedgerRole(role)` resolves the caller's membership for the `:ledgerId` route param and rejects below the required rank; it sets `ledgerId` / `ledgerRole` on the Hono context for the handler to reuse. Attach it *per route* (not `.use('*')`) so the param resolves, and *before* `validate` so unauthorized callers never have their body parsed. A non-member gets **404** (so ledger ids are not enumerable); an under-privileged member gets **403**. Member management adds one rule on top of rank: you may only act on someone you strictly `outranks`, and only assign a role below your own.
- `worker/lib/auth.ts` — `better-auth` instance (Drizzle adapter over `worker/database/schemas/auth.ts`, Google social login). `worker/routes/auth.ts` just forwards all requests to `auth.handler`.
- `worker/database/db.ts` — Drizzle D1 client, built from the `DATABASE` binding (via `cloudflare:workers` `env`, not `ctx.env` — bindings are accessed as module-level imports throughout the worker, not threaded through Hono context).
- `worker/database/schemas/` — Drizzle table definitions. `entries.ts` and `form.ts` are app tables; `auth.ts` is the better-auth-owned schema (user/session/account/verification). Insert/update/select Zod schemas are generated from tables via `drizzle-zod` (`createInsertSchema`/`createUpdateSchema`/`createSelectSchema`) rather than hand-written.
- `worker/services/` — DB access functions per resource (e.g. `services/entries.ts`), called from routes. Errors are wrapped as `HTTPException` using the codes in `worker/status-codes.ts`.
- `worker/lib/validator.ts` — a `validate(target, zodSchema)` wrapper around `hono/validator` used as route middleware to validate request bodies against the drizzle-zod schemas.
- `worker/lib/cache.ts` — thin get/set wrapper over the `APP_CACHE` KV binding. The dynamic form schema is cached per ledger under `ledger:<id>:form_schema` for 24h, write-through on every mutation.
- `worker/lib/email.ts` — delivery seam for ledger invitations. **No provider is configured**: it logs instead of sending. Swapping in a real one is a change to this file only. Callers must never let a send failure fail the request — the row is already committed and the invite works without the email.
- `worker/status-codes.ts` / `worker/status-phrases.ts` — **generated files, do not hand-edit** (see header comment).
- The "form" feature (`worker/routes/form.ts`, `worker/database/schemas/form.ts`, `worker/bindings.ts`'s `Field`/`FormSchema` types) is a dynamic/configurable field schema for expense entries, stored as JSON in D1 and cached in KV — not a static form. It is **per ledger** (one `forms` row per ledger, created in the same batch as the ledger), and editing it requires the `admin` role. Nothing in the frontend consumes it yet.
- `worker/database/schemas/relations.ts` — every `relations()` declaration lives here, apart from the table definitions. Keeping them beside their tables created import cycles that silently degraded drizzle-zod's inference. Do not move them back.

### Invitations: two paths

`POST /api/ledgers/:ledgerId/invitations` branches on whether the email already has an account:

- **No account** — a shell `user` row is created (placeholder name, `emailVerified: false`) *plus* the membership, in one batch. They are a member immediately and show as **Pending** in the member list. On their first Google sign-in, better-auth links the new account to that row. This depends on `account.accountLinking` in `worker/lib/auth.ts` (`trustedProviders: ['google']`, `updateUserInfoOnLink: true`) — do not remove it, and never enable `disableImplicitLinking`, or these invites break at sign-in with `account_not_linked`.
- **Account exists** — a pending `ledger_invitations` row they must accept or decline at `/invitations`, so existing users are not pulled into a ledger without consent.

"Pending" is **derived**, not stored: a member with no `account` row has never completed a sign-in. `emailVerified` cannot stand in for it — better-auth never flips that column when linking.

### Frontend (`app/`)

- Routing is file-based via TanStack Router (`app/routes/`), code-generated into `app/routeTree.gen.ts` — **do not hand-edit that file**, it's rebuilt by the `tanstackRouter` Vite plugin (configured in `vite.config.ts`) on every dev/build run.
- Two route groups: `_auth` (sign-in/sign-up, unauthenticated layout) and `_dashboard` (the main app). `_dashboard/route.tsx` guards itself client-side in `beforeLoad` by checking `better-auth`'s `getSession()` and redirecting to `/sign-in` if absent — this is in addition to, not instead of, the worker's server-side session check. It returns the session so `user` is available via `Route.useRouteContext()`.
- **The active ledger is the `$ledgerId` route param**, not a store or a persisted preference. `localStorage` holds only a `xpens:lastLedgerId` hint (`app/lib/last-ledger.ts`) that decides where `/` lands. Query keys derive from the param, so cache scoping cannot drift from the UI.
- Role gating in the UI (`app/components/role-gate.tsx`, `app/lib/roles.ts`) is **presentation only** — the server re-checks every mutation. `app/lib/roles.ts` deliberately duplicates the worker's rank helpers: importing the worker's *values* would pull drizzle into the client bundle.
- `app/apis/http.ts` is the single fetch wrapper. It surfaces the worker's `{ msg }` error body, which is what makes `toast.promise`'s error branch show real messages like "this action requires the admin role".
- `app/apis/` — thin `fetch` wrappers per resource, called from components/hooks (no generated API client), all built on `app/apis/http.ts`. `app/query-keys.ts` centralizes TanStack Query cache keys; entry, member and invitation keys are **scoped by ledger id**.
- `app/lib/auth.ts` exports the `better-auth` React client (`signIn`/`signOut`/`signUp`); route guards create their own separate `createAuthClient()` instance rather than importing it.
- UI components in `app/components/ui/` are shadcn-style primitives (see `components.json`) built on `@base-ui/react`; forms use `@tanstack/react-form` (see `app/hooks/form.ts` for shared form hook setup).

### Env vars

Required in `.env` for local dev (see `worker/lib/auth.ts`): `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
