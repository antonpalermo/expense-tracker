# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"xpens" — a CRUD expense tracker. React (TanStack Router/Query/Form/Table + Vite) frontend and a Hono API, both deployed as a single Cloudflare Worker (static assets + `/api/*` routed to the worker). Data lives in Cloudflare D1 (SQLite via Drizzle ORM); Cloudflare KV is used as a cache layer. Auth is handled by `better-auth` (Google OAuth + session cookies).

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

There is no test suite configured in this repo.

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
- `worker/lib/session.ts` — global middleware applied to every `/api/*` request. It calls `better-auth`'s `getSession`, and rejects with 401 unless the path contains `/auth` (i.e. auth endpoints are the only ones reachable without a session). Any new route file is unauthenticated-by-default only if its path contains `/auth`; everything else requires a session automatically.
- `worker/lib/auth.ts` — `better-auth` instance (Drizzle adapter over `worker/database/schemas/auth.ts`, Google social login). `worker/routes/auth.ts` just forwards all requests to `auth.handler`.
- `worker/database/db.ts` — Drizzle D1 client, built from the `DATABASE` binding (via `cloudflare:workers` `env`, not `ctx.env` — bindings are accessed as module-level imports throughout the worker, not threaded through Hono context).
- `worker/database/schemas/` — Drizzle table definitions. `entries.ts` and `form.ts` are app tables; `auth.ts` is the better-auth-owned schema (user/session/account/verification). Insert/update/select Zod schemas are generated from tables via `drizzle-zod` (`createInsertSchema`/`createUpdateSchema`/`createSelectSchema`) rather than hand-written.
- `worker/services/` — DB access functions per resource (e.g. `services/entries.ts`), called from routes. Errors are wrapped as `HTTPException` using the codes in `worker/status-codes.ts`.
- `worker/lib/validator.ts` — a `validate(target, zodSchema)` wrapper around `hono/validator` used as route middleware to validate request bodies against the drizzle-zod schemas.
- `worker/lib/cache.ts` — thin get/set wrapper over the `APP_CACHE` KV binding, used for caching (e.g. the dynamic form schema in `worker/routes/form.ts`, cached for 24h and invalidated on write).
- `worker/status-codes.ts` / `worker/status-phrases.ts` — **generated files, do not hand-edit** (see header comment).
- The "form" feature (`worker/routes/form.ts`, `worker/database/schemas/form.ts`, `worker/bindings.ts`'s `Field`/`FormSchema` types) is a dynamic/configurable field schema for expense entries, stored as JSON in D1 and cached in KV — not a static form.

### Frontend (`app/`)

- Routing is file-based via TanStack Router (`app/routes/`), code-generated into `app/routeTree.gen.ts` — **do not hand-edit that file**, it's rebuilt by the `tanstackRouter` Vite plugin (configured in `vite.config.ts`) on every dev/build run.
- Two route groups: `_auth` (sign-in/sign-up, unauthenticated layout) and `_dashboard` (the main app). `_dashboard/route.tsx` guards itself client-side in `beforeLoad` by checking `better-auth`'s `getSession()` and redirecting to `/sign-in` if absent — this is in addition to, not instead of, the worker's server-side session check.
- `app/apis/` — thin `fetch` wrappers per resource, called from components/hooks (no generated API client). `app/query-keys.ts` centralizes TanStack Query cache keys.
- `app/lib/auth.ts` exports the `better-auth` React client (`signIn`/`signOut`/`signUp`); route guards create their own separate `createAuthClient()` instance rather than importing it.
- UI components in `app/components/ui/` are shadcn-style primitives (see `components.json`) built on `@base-ui/react`; forms use `@tanstack/react-form` (see `app/hooks/form.ts` for shared form hook setup).

### Env vars

Required in `.env` for local dev (see `worker/lib/auth.ts`): `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
