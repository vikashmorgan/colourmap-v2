# Visitor mode — public visuals without sign-in

**Status:** Shipped.
**Goal:** Let anyone open the geometry visuals fast, without the Google login
wall — a "visitor mode" — while keeping every personal surface gated.

## What's public

Exactly one path today: **`/geometry-field`** (the geometry builder / visuals,
including its sub-paths). It's a pure client-side Three.js surface that reads no
personal data, so it's safe to expose. The allowlist lives in
`lib/auth/visitor.ts` (`VISITOR_PATHS` + `isVisitorPath`).

Everything else under `app/(app)/` still requires a Supabase session and
redirects logged-out users to `/login` exactly as before.

## How it works

1. **`proxy.ts` → `lib/supabase/proxy.ts` (`updateSession`)** sets an
   `x-pathname` request header on every request (rebuilt after the Supabase
   cookie refresh so the session cookies are preserved). Next.js doesn't give
   server-component layouts the current pathname, so this header carries it.
2. **`app/(app)/layout.tsx`** reads `x-pathname`. If there's no user:
   - and the path is a visitor path → render the app shell as a **visitor**
     (no user-bound header data; a "Sign in" link replaces the user card);
   - otherwise → `redirect('/login')` (unchanged gate for all private routes).
3. **`app/(auth)/login/page.tsx`** offers an **"Explore the visuals — no
   sign-in →"** link to `/geometry-field`, so the login screen is no longer a
   dead end for visitors.

## Security boundary

- Only `VISITOR_PATHS` are reachable logged-out. Adding a route to that list is
  the *only* way to make it public — everything else stays gated by the layout.
- `isVisitorPath` matches the exact base or a `base/` sub-path, so lookalike
  prefixes (e.g. `/geometry-fields-secret`) do **not** slip through. Covered by
  `lib/auth/visitor.test.ts`.
- `DEV_BYPASS_AUTH` is unrelated and remains dev-only (it throws at import in
  production); visitor mode is a production-safe path allowlist, not a bypass.

## Extending

To expose another visuals-only route later (e.g. a public gallery), add its path
to `VISITOR_PATHS` and confirm the page reads no personal data.
