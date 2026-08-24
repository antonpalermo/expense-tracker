# app/CLAUDE.md

Guidance specific to the frontend (`app/`) source tree. See the root `CLAUDE.md` for the `@/` alias split, repo-wide commands, and gotchas.

### App (`app/`)

- Routing is file-based via TanStack Router (`app/routes/`), code-generated into `app/routeTree.gen.ts` — **do not hand-edit that file**, it's rebuilt by the `tanstackRouter` Vite plugin (configured in `vite.config.ts`) on every dev/build run.
- Two route groups: `_auth` (sign-in/sign-up, unauthenticated layout) and `_dashboard` (the main app). `_dashboard/route.tsx` guards itself client-side in `beforeLoad` by checking `better-auth`'s `getSession()` and redirecting to `/sign-in` if absent — this is in addition to, not instead of, the worker's server-side session check. It returns the session so `user` is available via `Route.useRouteContext()`.
- **The active ledger is the `$ledgerId` route param**, not a store or a persisted preference. `localStorage` holds only a `xpens:lastLedgerId` hint (`app/lib/last-ledger.ts`) that decides where `/` lands. Query keys derive from the param, so cache scoping cannot drift from the UI.
- Role gating in the UI (`app/components/role-gate.tsx`, `app/lib/roles.ts`) is **presentation only** — the server re-checks every mutation. `app/lib/roles.ts` deliberately duplicates the worker's rank helpers: importing the worker's *values* would pull drizzle into the client bundle.
- `app/apis/http.ts` is the single fetch wrapper. It surfaces the worker's `{ msg }` error body, which is what makes `toast.promise`'s error branch show real messages like "this action requires the admin role".
- `app/apis/` — thin `fetch` wrappers per resource, called from components/hooks (no generated API client), all built on `app/apis/http.ts`. `app/query-keys.ts` centralizes TanStack Query cache keys; entry, member and invitation keys are **scoped by ledger id**.
- `app/lib/auth.ts` exports the `better-auth` React client (`signIn`/`signOut`/`signUp`/`sendVerificationEmail`/`requestPasswordReset`/`resetPassword`) and the underlying `authClient` instance, which both `_dashboard/route.tsx` and `_auth/route.tsx` import directly for their `beforeLoad` guards (dashboard redirects to `/sign-in` when there's no session; `_auth` redirects to `/` when there is one — the inverse).
- UI components in `app/components/ui/` are shadcn-style primitives (see `components.json`) built on `@base-ui/react`; forms use `@tanstack/react-form` (see `app/hooks/form.ts` for shared form hook setup).
