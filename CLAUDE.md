# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"xpens" — a shared expense tracker. Entries live in **ledgers**, which are shared between users through an explicit membership table with roles (viewer / member / admin / owner). React (TanStack Router/Query/Form/Table + Vite) frontend and a Hono API, both deployed as a single Cloudflare Worker (static assets + `/api/*` routed to the worker). Data lives in Cloudflare D1 (SQLite via Drizzle ORM); Cloudflare KV is used as a cache layer. Auth is handled by `better-auth` (Google OAuth + session cookies).

## Commands

Package manager is **bun**. Standard scripts (`dev`, `build`, `lint`, `preview`, `deploy`) are in `package.json`.

- `bun run cf-typegen` — regenerate `worker-configuration.d.ts` from `wrangler.jsonc` bindings.
- `bun run db:gen` — generate a new Drizzle migration from schema changes into `.migrations/` (uses `drizzle.config.ts`; drizzle-kit is only used to generate SQL, not to run it).
- `bun run db:migrate` — apply migrations to the remote D1 database via `wrangler d1 migrations apply xpens`.
- `bun wrangler d1 migrations apply xpens --local` — apply migrations to the local D1 database (needed once after cloning, before `bun dev` works).
- `bun run test` — run the worker test suite once (`vitest run`).
- `bun run test:watch` — `vitest` in watch mode; re-runs on save.

Verification is `bun run test`, `bun run build` (which typechecks first), `bun run lint`, and manual flows for anything in `app/`.

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

Worker-specific conventions (route/service/db layout, the invitation flow, testing) live in `worker/CLAUDE.md`; frontend-specific conventions (routing, ledger-as-route-param, role gating) live in `app/CLAUDE.md`. Both load automatically when you work under that directory.

### Env vars

Required in `.env` for local dev (see `worker/lib/auth.ts`): `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PLUNK_SECRET_KEY` (gates email verification and password reset mail — without it, `worker/lib/email.ts`'s sends fail, which is swallowed, so sign-up/reset still work locally but no email arrives).
