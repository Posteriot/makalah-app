# Verified Auth Audit — Final Report

**Date:** 2026-04-21
**Branch:** `access-issues`
**Scope:** Sign-in, session durability, accessibility, security
**Method:** 3-agent audit → 3-agent verification (findings accuracy + fix safety + blast radius)

---

## Audit Process

1. **Initial audit** — 3 parallel agents audited ~30 auth files across durability, accessibility/UX, and security.
2. **Verification audit** — 3 parallel agents verified every finding against actual code at exact line references, assessed proposed fix correctness, and evaluated blast radius against existing callers/tests/dependencies.
3. **Findings dropped** — 5 findings were incorrect after verification and removed from this report.

---

## Finding Status Legend

| Status | Meaning |
|---|---|
| CONFIRMED | Finding accurate, proposed fix correct and safe |
| FIX REVISED | Finding accurate, but original proposed fix would cause problems — revised fix provided |
| PARTIALLY CORRECT | Finding directionally right, severity or detail adjusted after verification |
| NEEDS RESEARCH | Finding plausible but cannot be confirmed without further investigation |

---

## CRITICAL

### S1: Admin Privilege Escalation via Client-Controlled `requestorUserId`

- **Status:** CONFIRMED + FIX REVISED
- **Aspect:** Security
- **Confidence:** 100%
- **File:** `convex/users.ts:103-205`
- **Related:** `convex/permissions.ts:32-41`, `convex/authHelpers.ts:45-49`

**Problem:** `listAllUsers`, `getUserStats`, `listUsersPaginated`, `getUserForAdminManagement` accept a client-supplied `requestorUserId` arg and pass it directly to `requireRole(db, requestorUserId, "admin")`. `requireRole` only does a DB lookup — checks if that ID's record has `role === "admin"`. It does NOT touch `ctx.auth`. Any authenticated user who knows an admin's Convex `_id` can supply it as `requestorUserId` and get full admin data access.

**Fix:** Add `await requireAuthUserId(ctx, requestorUserId)` before `requireRole` in all 4 handlers. This binds the JWT identity to the supplied userId.

**Fix caveat:** All 4 handlers destructure `({ db }, ...)` from context, discarding `ctx`. Must change handler signature to `(ctx, ...)` so `ctx` is available for `requireAuthUserId`.

```ts
// Current (vulnerable):
handler: async ({ db }, { requestorUserId }) => {
  await requireRole(db, requestorUserId, "admin")
  // ...
}

// Fixed:
handler: async (ctx, { requestorUserId }) => {
  await requireAuthUserId(ctx, requestorUserId)
  await requireRole(ctx.db, requestorUserId, "admin")
  // ...
}
```

**Blast radius:** Safe. Pattern already established in `getById`, `getUserRole`, `checkIsAdmin`, `checkIsSuperAdmin`, `updateProfile`. Admin panel callers pass `userId` from `useCurrentUser()` which derives from the real session. Server-side caller in `src/app/api/admin/users/delete/route.ts:53-60` already passes a JWT-validated Convex user ID.

**Callers verified:**
- `listUsersPaginated` — `src/components/admin/UserList.tsx:110` (useQuery, client-side)
- `getUserStats` — `src/components/admin/AdminOverviewContent.tsx:28` (useQuery, client-side)
- `getUserForAdminManagement` — `src/app/api/admin/users/delete/route.ts:54` (fetchQuery, server-side with convexToken)
- `listAllUsers` — no active callers found in source code

---

### S2: `getUserByBetterAuthId` Fully Public — No Authentication

- **Status:** CONFIRMED + FIX REVISED
- **Aspect:** Security
- **Confidence:** 100%
- **File:** `convex/users.ts:59-70`

**Problem:** Accepts any arbitrary `betterAuthUserId` string and returns the full user record (email, role, subscriptionStatus, etc.) with no auth check. Any browser client can enumerate user records.

**Fix — DO NOT convert to `internalQuery`.** This would break the only caller: `src/lib/hooks/useCurrentUser.ts:18` uses `useQuery` which cannot call internal queries. The entire app's user loading would break.

**Revised fix options:**
1. Add identity check: `identity.subject === betterAuthUserId` — user can only fetch own record.
2. Replace pattern entirely: `useCurrentUser` should use `api.users.getMyUser` (already exists at `convex/users.ts:44-56`, uses `identity.subject`) instead of accepting an external `betterAuthUserId` argument.

**Recommendation:** Option 2 is cleaner — eliminates the argument-based lookup entirely.

---

### A1: Magic Link + Forgot Password Permanently Blocked Without Turnstile

- **Status:** CONFIRMED
- **Aspect:** Accessibility
- **Confidence:** 95%
- **File:** `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:80, 320-323, 370-373`
- **Related:** `src/app/api/auth/email-recovery-precheck/route.ts:122-127`

**Problem:** `requiresRecoveryCaptcha = Boolean(turnstileSiteKey)`. If `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is empty/missing, both `handleMagicLink` and `handleForgotPassword` immediately error with `SERVICE_UNAVAILABLE`. User who forgot password = locked out, no recovery path. Server-side precheck also blocks independently if `TURNSTILE_SECRET_KEY` is missing.

**Fix:** Two options:
1. Allow flow without captcha (accepting abuse tradeoff) — bypass precheck, call BetterAuth endpoints directly.
2. Show clear "feature unavailable" message at render time with alternative path (e.g., "contact support"), not after submit.

Both client-side and server-side gates need to be addressed.

---

## HIGH

### D1: `isAuthenticatedFromBetterAuthCookies` Returns True on Network Error

- **Status:** CONFIRMED — but dead code
- **Aspect:** Durability
- **File:** `src/lib/auth-server.ts:59-63`

**Problem:** Returns `true` for `status === "network_error"`. However, verification found **no active callers** in the codebase. All routes use `isAuthenticated()` which calls `getToken()` → `validateBetterAuthCookies()` directly, and `getToken()` already returns `null` on network errors.

**Fix:** Delete the function or rename to `isAuthenticatedOrNetworkError` with doc comment warning. No functional impact — zero callers.

---

### D2: Tab Wake Only Checks localStorage, Not Live Session Validity

- **Status:** CONFIRMED + FIX REVISED
- **Aspect:** Durability
- **File:** `src/app/providers.tsx:141-164`

**Problem:** `isSessionCleared()` only reads `localStorage.getItem("better-auth_cookie") === "{}"`. Does not detect server-side session revocation or expired sessions that localStorage still holds.

**Original fix rejected:** Adding `authClient.getSession()` on every `visibilitychange`/`focus` fires 2-3 API calls per tab switch. Creates false logouts on cold starts, hammers the auth API.

**Revised fix:** Track session `expiresAt` client-side. Only do a live check if the stored session's expiry has passed. Alternatively: confirm logout via 1 network call only when `isSessionCleared()` is about to trigger a redirect.

---

### S3: Plaintext Password in `sessionStorage` During 2FA Flow

- **Status:** CONFIRMED + NEEDS RESEARCH
- **Aspect:** Security
- **Confidence:** 95%
- **File:** `src/lib/auth-2fa.ts:6-17`
- **Related:** `src/app/(auth)/verify-2fa/page.tsx:212-248`

**Problem:** `Pending2FA` interface stores `{ email, password, redirectUrl }` in `sessionStorage` as plain JSON. Password remains accessible for the entire 2FA OTP entry duration. XSS anywhere = credential exfiltration.

**Why password is stored:** `continueSignInWithBypassToken` calls `signIn.email({ email, password })` with bypass token in custom header. BetterAuth email sign-in flow requires password re-submission alongside bypass token — the bypass token alone does not create a session.

**Fix — needs research:** Verify if BetterAuth's cross-domain plugin provides a session-creation endpoint that accepts just the bypass token. If not, the fix requires BetterAuth plugin-level changes or an encrypted ephemeral server-side nonce.

**Interim fix:** Add `expiresAt` TTL (5 minutes, matching OTP TTL) in `setPending2FA`, check in `getPending2FA`, clear if expired.

---

### S4: `sendOtp` Endpoint Unauthenticated

- **Status:** NEEDS RESEARCH
- **Aspect:** Security
- **File:** `src/lib/auth-2fa.ts:47-65`

**Problem:** `POST /api/auth/2fa/send-otp` with no auth token, no CSRF token, no captcha. Could enable email bombing and email enumeration.

**Caveat:** This endpoint may be a BetterAuth built-in route with its own rate limiting. Cannot confirm vulnerability without reading the Convex HTTP handler / BetterAuth plugin implementation.

**Action:** Verify BetterAuth 2FA plugin built-in protections before implementing any fix.

---

### A2: OTT Timeout URL Persistence Causes Repeated Spinner

- **Status:** PARTIALLY CORRECT
- **Aspect:** Accessibility
- **File:** `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:105-130`

**Problem:** After 5s OTT timeout, `ottTimedOut = true` and form renders. But `?ott=` stays in URL. On next navigation or page interaction that triggers re-evaluation, `isOTTFlow` remains `true`, potentially causing another 5s spinner. Not an infinite loop (has 5s exit), but degraded UX.

**Fix:** Strip `?ott=` from URL via `window.history.replaceState` when timeout fires. OTT token is consumed on read by the SDK — URL is cosmetic after mount.

**Blast radius:** Safe — OTT exchange already in-flight or failed by timeout.

---

### A4: `isSubmitting` Ref Not Reset on bfcache Restore (2FA Page)

- **Status:** CONFIRMED
- **Aspect:** Accessibility
- **File:** `src/app/(auth)/verify-2fa/page.tsx:210, 250-296`

**Problem:** After OTP submit + navigation, browser back button restores page from bfcache. `isSubmitting.current` remains `true` (useRef persists across bfcache). Guard at line 251 silently blocks all subsequent submissions.

**Fix:** Add `popstate`/`pageshow` listener that resets `isSubmitting.current = false`. Pattern already exists in sign-in page at lines 110-113.

**Blast radius:** Safe — additive only.

---

## MEDIUM

### D4: OTT Grace Period Hardcoded 5s — Original Fix Rejected

- **Status:** PARTIALLY CORRECT — fix revised
- **Aspect:** Durability
- **File:** `src/components/chat/ChatContainer.tsx:110-127`

**Problem:** If Convex cold start > 5s, grace expires and redirect to `/sign-in` fires mid-OTT exchange.

**Original fix rejected:** Tying to `isSessionPending` breaks OTT flow — BetterAuth resolves `isSessionPending = false` before OTT exchange completes, causing premature redirect. Also has no timeout escape if session stays pending.

**Revised fix:** Keep timeout-based approach. Optionally reduce to 3s or increase to 8s based on observed cold start latency. Current 5s is reasonable.

---

### D6: `pending_2fa` No Expiry in sessionStorage

- **Status:** PARTIALLY CORRECT
- **Aspect:** Durability
- **File:** `src/lib/auth-2fa.ts:17-40`

**Problem:** `setPending2FA` stores data with no TTL. If verify-2fa crashes before `clearPending2FA` runs on success path, stale data persists for tab lifetime.

**Fix:** Add `expiresAt: Date.now() + 5 * 60 * 1000` in `setPending2FA`. Check in `getPending2FA` and clear if expired. Low risk, addresses crash-path gap.

Note: `sessionStorage` clears automatically on tab close, so the real exposure is within-tab crash scenarios only.

---

### A6: OTP Digit Inputs — Label Not Programmatically Associated

- **Status:** PARTIALLY CORRECT
- **Aspect:** Accessibility
- **File:** `src/app/(auth)/verify-2fa/page.tsx:409-427`

**Problem:** `<label className="sr-only">Kode OTP</label>` exists but has no `htmlFor`. Inputs have no `id`. Screen readers cannot associate label with inputs.

**Fix:** Add `htmlFor` + `id` to first input, and `aria-label={`Digit ${i+1} dari 6`}` to each input. Or wrap in `<fieldset>` + `<legend>`.

---

### A7: Google Sign-Up Missing `errorCallbackURL`

- **Status:** CONFIRMED
- **Aspect:** Accessibility
- **File:** `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:41-55`

**Problem:** Sign-in page has `errorCallbackURL: signInCallback`. Sign-up page omits it. OAuth errors drop user out of flow.

**Fix:** Add `errorCallbackURL` pointing to **sign-in page** (not sign-up), because sign-in already handles `?error=signup_disabled` display. Preserve `redirect_url` param.

---

### A8: WaitlistForm Inputs No Accessible Labels

- **Status:** CONFIRMED
- **Aspect:** Accessibility
- **File:** `src/components/auth/WaitlistForm.tsx:89-134`

**Problem:** All 3 inputs (first name, last name, email) use only `placeholder`. No `<label>`, no `aria-label`, no `aria-labelledby`. Unlike sign-up form which correctly uses `<label htmlFor="..." className="sr-only">`.

**Fix:** Add `<label htmlFor="waitlist-first-name" className="sr-only">` etc., or `aria-label` per input.

---

### A9: Convex Infrastructure Error Shown Verbatim in WaitlistForm

- **Status:** CONFIRMED
- **Aspect:** Accessibility
- **File:** `src/components/auth/WaitlistForm.tsx:46-53`

**Problem:** `setError(err.message)` — application-level errors are Indonesian (safe), but Convex infrastructure errors are English ("Server Error", "Could not connect to Convex backend").

**Fix:** Map known error cases to Indonesian messages. Catch-all with generic fallback: `"Terjadi kesalahan. Silakan coba lagi."`.

---

### S6: `isLocalDevOrigin` Allows Any Localhost Port — No Production Guard

- **Status:** PARTIALLY CORRECT
- **Aspect:** Security
- **File:** `convex/authOrigins.ts:14-23`

**Problem:** `isLocalDevOrigin` returns `true` for any `localhost`/`127.0.0.1` origin regardless of port. No `NODE_ENV` guard. In production, a malicious local process could be treated as trusted origin.

**Fix:** Add `NODE_ENV !== "production"` guard on the dynamic origin expansion. Real-world exploitability is low but fix is trivial.

---

## LOW

### D9: `email-recovery-precheck` Returns `CAPTCHA_FAILED` for Server Errors

- **Status:** CONFIRMED
- **Aspect:** Durability
- **File:** `src/app/api/auth/email-recovery-precheck/route.ts:213-222`

**Problem:** Catch-all for `fetchMutation` errors returns `{ ok: false, code: "CAPTCHA_FAILED" }` even for Convex timeout, network failure, etc. User sees "Verifikasi keamanan gagal" when infrastructure failed.

**Fix:** Return `code: "SERVICE_UNAVAILABLE"` for unexpected errors. Reserve `CAPTCHA_FAILED` for actual Turnstile failures.

---

### A10: Password Minimum Requirement — No Inline Hint

- **Status:** CONFIRMED
- **Aspect:** Accessibility
- **File:** `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:73-76`

**Problem:** Validation only on submit. No visible hint below password field. User discovers 8-char minimum only after failed attempt.

**Fix:** Add inline note "Minimal 8 karakter" below password field. Optionally add `minLength={8}` attribute.

---

## Dropped Findings (Incorrect After Verification)

| # | Original Claim | Why Dropped |
|---|---|---|
| A3 | Credential error "Lupa password?" as plain text, not link | Mode-switch buttons already exist on the page. Error is guidance text, not the only path. |
| A5 | `isRedirecting` set before `signIn.social()` resolve | Intentional — success path is full page navigation. `catch` correctly resets on failure. |
| D5 | `sessionError` silently suppresses redirect | Intentional defensive behavior — prevents false logout on transient errors. |
| D8 | `pageshow` bfcache stale closure | Closure behavior intentional — prevents double redirects. `redirecting` accurately reflects state. |
| D3 fix | Add storage event listener to `SessionCookieSync` | Causes double-sync loop risk. Monitor first, fix if real problem observed. |
| D4 fix | Tie OTT grace to `isSessionPending` | Breaks OTT exchange flow — BetterAuth resolves pending before OTT completes. No timeout escape. |

---

## Execution Phases

### Phase 1 — Zero Risk (safe to ship immediately)

All findings below are additive-only, no existing behavior removed.

| # | Task | File |
|---|---|---|
| A2 | Strip `?ott=` from URL on timeout | `sign-in/page.tsx` |
| A7 | Add `errorCallbackURL` to Google sign-up | `sign-up/page.tsx` |
| D9 | Fix misleading `CAPTCHA_FAILED` error code | `email-recovery-precheck/route.ts` |
| A10 | Password minimum hint | `sign-up/page.tsx` |
| A6 | OTP accessible labels | `verify-2fa/page.tsx` |
| A8 | WaitlistForm accessible labels | `WaitlistForm.tsx` |
| A9 | Convex error message fallback | `WaitlistForm.tsx` |

### Phase 2 — Low Risk (needs targeted testing)

| # | Task | File | Test Focus |
|---|---|---|---|
| S1 | Admin JWT binding | `convex/users.ts` | Test admin panel still loads, verify non-admin cannot access |
| A4 | 2FA `isSubmitting` bfcache reset | `verify-2fa/page.tsx` | Browser back button after OTP submit |
| D6 | `pending_2fa` TTL expiry | `auth-2fa.ts` | 2FA flow still works, expired data cleared |
| S6 | Localhost origin production guard | `convex/authOrigins.ts` | Dev still works, prod rejects non-standard ports |
| D1 | Delete dead `isAuthenticatedFromBetterAuthCookies` | `auth-server.ts` | Grep confirms no callers |

### Phase 3 — Needs Research/Redesign

| # | Task | Research Required |
|---|---|---|
| S2 | `getUserByBetterAuthId` → identity check or replace with `getMyUser` | Verify `useCurrentUser` hook works with `getMyUser` pattern |
| A1 | Turnstile dependency graceful degradation | Decide: allow without captcha vs. feature unavailable |
| S3 | Password in sessionStorage | Verify BetterAuth bypass token protocol — can it create session without password replay? |
| S4 | `sendOtp` rate limiting | Read BetterAuth 2FA plugin source for built-in protections |
| D2 | Tab wake session check redesign | Design expiry-based approach with debounced live check |

---

## Files Index

### Auth Core
- `src/lib/auth-client.ts` — Better Auth client instance
- `src/lib/auth-server.ts` — Better Auth server instance, token validation
- `src/app/api/auth/[...all]/route.ts` — Better Auth catch-all handler
- `convex/auth.ts` — Convex auth setup
- `convex/auth.config.ts` — Auth configuration
- `convex/authHelpers.ts` — `requireAuthUserId`, `requireAuthUser` (JWT-binding helpers)
- `convex/authOrigins.ts` — Trusted origins
- `convex/permissions.ts` — `requireRole` (DB-only, no JWT binding)

### Auth Pages
- `src/app/(auth)/layout.tsx` — Auth layout
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` — Sign-in page
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` — Sign-up page
- `src/app/(auth)/verify-2fa/page.tsx` — 2FA verification
- `src/app/(auth)/waitinglist/page.tsx` — Waiting list

### Auth State Management
- `src/app/providers.tsx` — `SessionCookieSync`, `CrossTabSessionSync`
- `src/lib/hooks/useCurrentUser.ts` — User loading hook
- `src/components/chat/ChatContainer.tsx` — OTT grace, session gating

### 2FA & Recovery
- `src/lib/auth-2fa.ts` — 2FA client logic, `setPending2FA`
- `convex/twoFactorBypass.ts` — Cross-domain 2FA bypass
- `convex/authRecovery.ts` — Account recovery
- `src/app/api/auth/email-recovery-precheck/route.ts` — Recovery precheck

### UI Components
- `src/components/ui/auth-button.tsx` — Auth button
- `src/components/auth/WaitlistForm.tsx` — Waitlist form

### Admin (vulnerable)
- `convex/users.ts` — Admin queries (S1, S2)
- `src/components/admin/UserList.tsx` — Admin user list (caller)
- `src/components/admin/AdminOverviewContent.tsx` — Admin overview (caller)
- `src/app/api/admin/users/delete/route.ts` — Admin delete (server-side caller)
