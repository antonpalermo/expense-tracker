# Auth flows: registration, login, password reset, route protection

Status: approved for implementation planning
Date: 2026-08-24

## Context

`better-auth` is already wired up in this app, but only for Google OAuth
(`worker/lib/auth.ts`). Ledger invitations for an unregistered email create a
"shell" `user` row (placeholder name, `emailVerified: false`, no `account`
row) that gets claimed on the invitee's first Google sign-in
(`account.accountLinking` in `worker/lib/auth.ts`).

The frontend already has `_auth/sign-in.tsx` and `_auth/sign-up.tsx`, but
they're static mockups: no submit handlers, the "Forgot your password?" link
goes to `#`, and the sign-up page's Google button has no `onClick`.
`_dashboard/route.tsx` already guards itself client-side (`beforeLoad`
redirects to `/sign-in` if there's no session), and
`worker/lib/session.ts` already rejects every unauthenticated `/api/*`
request except `/api/auth/*` — so the server-side security boundary for
*data* already exists. What's missing is the actual login/registration/reset
functionality, and the mirror-image guard (redirect *away* from `/sign-in`
when already authenticated).

`worker/lib/email.ts` already sends transactional email via Plunk for ledger
invites, with the constraint that a send failure must never fail the
request it's attached to (the row is already committed either way). That
constraint does not apply to verification/reset email — those sends *are*
the point of the request, so a failure there should surface as an error.

## Goals

1. Email/password registration and login, alongside the existing Google
   OAuth (both stay available).
2. Required email verification before an email/password account can sign in.
3. Password reset via emailed link.
4. An invited "shell" user can claim their account via email/password
   sign-up (not just Google sign-in), by linking the credential to the
   existing shell row instead of colliding with it.
5. `_auth` routes (`/sign-in`, `/sign-up`, etc.) redirect an already
   authenticated user away, mirroring the existing `_dashboard` guard.
6. The `redirect` search param that `_dashboard`'s guard already attaches on
   redirect-to-sign-in is actually consumed after a successful login
   (currently dropped).

## Non-goals

- **Server-side rendering / a server-rendered route gate.** The app is a
  client-rendered SPA (Vite build → static assets, Worker only intercepts
  `/api/*`). A true server-rendered gate would require restructuring the
  entire app's rendering and deploy model (e.g. adopting an SSR-capable
  router), which is an independent, much larger change affecting every
  route, not an auth concern. The existing `worker/lib/session.ts` boundary
  already means no protected *data* can leak to an unauthenticated client
  regardless of client-side routing state; a disabled-JS client simply gets
  no functioning UI, not a data leak. SSR is deferred to its own future
  project.
- Rate limiting / lockout policy beyond better-auth's defaults.
- Multi-factor auth, magic links, passkeys.
- Changing or removing Google OAuth.

## Design

### Backend: `worker/lib/auth.ts`

Add to the `betterAuth()` config:

```
emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
        await sendPasswordResetEmail({ to: user.email, url })
    }
},
emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
        await sendVerificationEmail({ to: user.email, url })
    }
}
```

`sendPasswordResetEmail` and `sendVerificationEmail` are new functions in
`worker/lib/email.ts`, following the existing Plunk-via-raw-`fetch` shape of
`sendLedgerInvite` — **except** they let a send failure throw (propagating
as a 500) rather than swallowing it, since unlike an invite there is no
usable fallback path if the email never arrives.

### Shell-user linking

better-auth's default sign-up behavior, when `requireEmailVerification` is
on, returns a **synthetic fake user response** for a duplicate email
(anti-enumeration) and does not touch the database. That default would
silently no-op exactly the case we want to support: an invited shell user
registering with a password.

Add a `hooks.before` entry (better-auth's supported request-interception
mechanism, matched on the `/sign-up/email` path) that runs ahead of the
built-in handler:

1. Normalize the submitted email and look up the `user` row.
2. If a row exists **and it has no linked `account` rows** (the shell
   condition — matches how `worker/test/factories.ts`'s `createUser` already
   models an unlinked user), this is a shell user:
   - hash the submitted password (`ctx.context.password.hash`)
   - insert an `account` row (`providerId: 'credential'`) linked to the
     existing user id
   - update the user's `name` from the submitted value (replacing the
     placeholder)
   - let the request continue into the normal post-creation path (send
     verification email, return the real user), instead of the synthetic
     duplicate response.
3. If a row exists **with** a linked account already, fall through to
   better-auth's default (synthetic response) behavior unchanged — that's a
   real duplicate, not a shell.
4. If no row exists, fall through unchanged (normal new-user sign-up).

### Frontend: `app/routes/_auth/*`

- `sign-in.tsx` — wire with `useAppForm` (`app/hooks/form.ts` convention).
  Submits via `authClient.signIn.email({ email, password })`. On success,
  navigate to the `redirect` search param if present, else `/`. Surface
  errors from `authClient`'s response (e.g. unverified email) inline via the
  existing `FieldError` component.
- `sign-up.tsx` — same form conventions. Submits via
  `authClient.signUp.email({ name, email, password })`. Wire the
  already-present but inert Google button (`onClick` calling
  `signIn.social({ provider: 'google' })`, matching `sign-in.tsx`). On
  success, show a "check your email to verify" confirmation state rather
  than redirecting (sign-in is blocked until verified).
- New `forgot-password.tsx` — email field, submits via
  `authClient.forgetPassword({ email, redirectTo: '/reset-password' })`.
  Always shows the same generic "if that email exists, we've sent a link"
  confirmation regardless of whether the account exists, to avoid
  enumeration.
- New `reset-password.tsx` — reads `token` from the URL search params
  (`validateSearch`), new-password field, submits via
  `authClient.resetPassword({ newPassword, token })`, then redirects to
  `/sign-in` with a success toast.
- Verification landing: better-auth's `/verify-email` endpoint itself
  verifies the token and redirects to a `callbackURL`. Point that
  `callbackURL` at a small `_auth` route (e.g. `verify-email.tsx`) that
  reads a success/error search param and shows the corresponding message
  with a link to `/sign-in` — it does not perform verification itself.

All new pages live in the existing `_auth` route group (unauthenticated
layout, `app/routes/_auth/route.tsx`).

### Route protection

- `_auth/route.tsx` gets a `beforeLoad` mirroring `_dashboard`'s inverse:
  fetch the session; if present, `redirect({ to: '/' })`.
- `sign-in.tsx` gets `validateSearch` for a `redirect` field so the value
  `_dashboard`'s guard already attaches (`search: { redirect: location.href
  }`) is typed and consumed on successful login instead of silently dropped.
- No additional server-side gating is added (see Non-goals) — the
  `worker/lib/session.ts` middleware is already the real boundary for every
  `/api/*` request.

### Testing

- Worker: new/extended tests under `worker/test/routes/` covering, via the
  existing `req()`/`signInAs()`/factory conventions
  (`worker/CLAUDE.md`'s TDD loop):
  - sign-up creates an unverified user and a `credential` account; sign-in
    is rejected until verified.
  - sign-up with an email belonging to an existing shell user (created via
    `createUser` with no `createAccountFor` call) links the credential to
    that user instead of returning the synthetic duplicate response, and the
    user's placeholder name is replaced.
  - sign-up with an email belonging to a *linked* existing user returns the
    generic/synthetic duplicate response (no new row, no email sent).
  - forgot-password / reset-password happy path changes the credential and
    allows sign-in with the new password.
- Frontend: manual verification via `bun run dev` (per root `CLAUDE.md`,
  frontend changes are manually tested, not unit tested) — sign-up → click
  verification link → sign-in → forgot password → reset → sign-in with new
  password; confirm `_auth` redirects away when already signed in; confirm
  post-login redirect lands back on the originally requested page.

## Open items for the implementation plan

- Exact Plunk email templates/copy for verification and reset emails
  (follow `sendLedgerInvite`'s existing HTML-snippet style).
- Whether `resetPasswordTokenExpiresIn` / `emailVerification.expiresIn`
  need non-default values (better-auth defaults: reset token 1 hour).
