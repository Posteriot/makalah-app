# Design Doc: Auth Hardening

**Date:** 2026-04-21
**Branch:** `access-issues`
**Based on:** `verified-auth-audit-2026-04-21.md`
**Goal:** Durable access, frictionless accessibility, strong security

---

## Problem Statement

Audit terverifikasi menemukan 18 finding aktif di auth system (3 CRITICAL, 5 HIGH, 8 MEDIUM, 2 LOW). Dua finding CRITICAL adalah kerentanan keamanan yang bisa dieksploitasi sekarang (admin privilege escalation, user enumeration). Sisanya adalah kombinasi UX dead-ends, accessibility gaps, dan session durability issues yang mengganggu pengalaman pengguna.

---

## Design Principles

1. **Fail-safe, not fail-open** — Auth failure = deny access, never grant.
2. **JWT is the single source of identity** — Tidak ada client-supplied userId sebagai identity claim. Identity selalu dari `ctx.auth.getUserIdentity()`.
3. **Additive fixes first** — Prioritaskan fix yang menambah behavior tanpa mengubah existing flow.
4. **No silent failures** — User harus selalu tahu apa yang terjadi dan punya jalan keluar.

---

## Architecture Decisions

### AD-1: JWT Binding Pattern untuk Admin Queries

**Decision:** Semua Convex query/mutation yang menerima `userId` dari client HARUS memvalidasi `userId === JWT identity` via `requireAuthUserId(ctx, userId)` sebelum operasi apapun.

**Rationale:** `requireRole(db, userId, "admin")` hanya cek DB record — tidak ada binding ke caller identity. Pattern `requireAuthUserId` sudah established di 5+ handlers lain (`getById`, `getUserRole`, `checkIsAdmin`, etc.).

**Impact:** 4 handler di `convex/users.ts` perlu ubah signature dari `({ db }, ...)` ke `(ctx, ...)`.

### AD-2: Eliminate Argument-Based User Lookup

**Decision:** `getUserByBetterAuthId` (public query, no auth) diganti dengan pattern `getMyUser` yang sudah ada — identity dari JWT, bukan dari client arg.

**Rationale:** `getMyUser` (line 44-56) sudah pakai `identity.subject` untuk lookup. `useCurrentUser` hook tinggal di-rewire ke `getMyUser` instead of `getUserByBetterAuthId`.

**Risk mitigated:** Tidak convert ke `internalQuery` (breaks `useQuery` caller). Tidak tambah identity check di existing function (masih expose function signature yang menerima arbitrary ID).

### AD-3: Turnstile Graceful Degradation

**Decision:** Jika Turnstile tidak dikonfigurasi, recovery flows (magic link, forgot password) tetap tersedia tapi bypass precheck — langsung call BetterAuth endpoints.

**Rationale:** Lebih baik ada recovery path tanpa captcha daripada user locked out permanently. Precheck adalah optimization (email existence check + rate limit), bukan security gate — BetterAuth endpoints punya rate limiting sendiri.

**Alternative rejected:** "Feature unavailable" message — ini memindahkan masalah ke user, bukan menyelesaikannya.

### AD-4: Session Expiry Tracking untuk Tab Wake

**Decision:** Track `expiresAt` dari session token di client-side state. Pada `visibilitychange` (visible), cek apakah session expired. Hanya lakukan live server check jika `expiresAt` sudah lewat.

**Rationale:** Live check per-focus terlalu aggressive (2-3 API calls per tab switch). localStorage-only check (current) tidak deteksi server-side revocation. Expiry-based approach = sweet spot.

**Alternative rejected:** `authClient.getSession()` on every focus — causes false logouts on cold starts, hammers auth API.

### AD-5: 2FA Password Storage — Interim TTL

**Decision:** Tambah `expiresAt` TTL (5 menit) pada `pending_2fa` di sessionStorage. Ini interim fix sambil research apakah BetterAuth bypass token bisa create session tanpa password replay.

**Rationale:** Eliminasi total password dari sessionStorage butuh protocol-level change di BetterAuth cross-domain plugin. TTL 5 menit (match OTP TTL) membatasi exposure window tanpa break existing flow.

### AD-6: OTT Grace Period — Keep Timeout-Based Approach

**Decision:** Pertahankan timeout-based grace period (5s) untuk OTT exchange di `ChatContainer`. Tidak tie ke `isSessionPending`.

**Rationale:** `isSessionPending` resolve ke `false` sebelum OTT exchange selesai — BetterAuth cek session dulu (fast, dari localStorage), set `isPending = false`, baru process OTT token (async server round-trip 1-3s). Kalau grace period tied ke `isSessionPending`, redirect ke `/sign-in` terjadi sebelum OTT selesai. Timeout 5s sudah reasonable — cukup untuk kebanyakan Convex cold starts.

**Alternative rejected:** Tie ke `isSessionPending` — breaks OTT flow, no timeout escape jika session stays pending.

---

## Technical Design per Phase

### Phase 1 — Zero Risk Fixes

Semua additive-only. Tidak ada existing behavior yang diubah atau dihapus.

#### 1.1 Strip OTT from URL on Timeout (A2)

**File:** `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
**Change:** Di useEffect timeout handler (setelah `setOttTimedOut(true)`), tambah:
```ts
const url = new URL(window.location.href)
url.searchParams.delete("ott")
window.history.replaceState({}, "", url.toString())
```
**Why safe:** OTT token sudah di-consume oleh SDK saat mount. URL cuma cosmetic setelah itu.

#### 1.2 Add `errorCallbackURL` to Google Sign-Up (A7)

**File:** `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
**Change:** Tambah `errorCallbackURL` di `signIn.social()` call, pointing ke sign-in page (bukan sign-up) karena sign-in sudah handle `?error=signup_disabled`.
```ts
await signIn.social({
  provider: "google",
  callbackURL,
  requestSignUp: true,
  errorCallbackURL: `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`,
})
```

#### 1.3 Fix Misleading Error Code (D9)

**File:** `src/app/api/auth/email-recovery-precheck/route.ts`
**Change:** Di catch-all block (line ~213-222), ganti `code: "CAPTCHA_FAILED"` dengan `code: "SERVICE_UNAVAILABLE"` untuk non-unauthorized errors.

#### 1.4 Password Minimum Hint (A10)

**File:** `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
**Change:** Tambah inline hint di bawah password field:
```tsx
<p className="text-xs text-muted-foreground mt-1">Minimal 8 karakter</p>
```

#### 1.5 OTP Accessible Labels (A6)

**File:** `src/app/(auth)/verify-2fa/page.tsx`
**Change:** Dua perbaikan:

1. Fix orphan `<label>` — tambah `htmlFor="otp-digit-0"` ke existing `<label className="sr-only">` dan `id="otp-digit-0"` ke input pertama:
```tsx
<label htmlFor="otp-digit-0" className="sr-only">Kode OTP</label>
```

2. Tambah `aria-label` + `id` per digit input:
```tsx
<input
  id={`otp-digit-${i}`}
  aria-label={`Digit ${i + 1} dari 6`}
  // ... existing props
/>
```

#### 1.6 WaitlistForm Accessible Labels (A8)

**File:** `src/components/auth/WaitlistForm.tsx`
**Change:** Tambah `<label htmlFor="..." className="sr-only">` per input, matching pattern di sign-up form. Tambah `id` ke setiap input.

#### 1.7 WaitlistForm Error Fallback (A9)

**File:** `src/components/auth/WaitlistForm.tsx`
**Change:** Wrap error handling dengan error type checking (bukan regex — per CLAUDE.md anti-regex policy):
```ts
if (err instanceof ConvexError) {
  // Application-level errors from Convex mutations — already Indonesian
  setError(err.data as string)
} else if (err instanceof Error) {
  // Infrastructure errors (network, timeout, Convex runtime) — generic fallback
  setError("Terjadi kesalahan. Silakan coba lagi.")
} else {
  setError("Terjadi kesalahan. Silakan coba lagi.")
}
```
**Rationale:** Convex application errors (thrown via `ConvexError` in mutation handlers) are already Indonesian. All other `Error` instances are infrastructure-level (English) — catch-all with generic Indonesian fallback. Tidak pakai regex untuk classify error messages (violates CLAUDE.md anti-regex policy).

---

### Phase 2 — Security & Durability Fixes

Perlu targeted testing setelah implementasi.

#### 2.1 Admin JWT Binding (S1) — CRITICAL

**File:** `convex/users.ts`
**Change:** 4 handlers — ubah signature + tambah `requireAuthUserId`:

| Function | Line | Change |
|---|---|---|
| `listAllUsers` | ~103 | `({ db }, ...) → (ctx, ...)` + `requireAuthUserId` |
| `getUserStats` | ~130 | Same |
| `listUsersPaginated` | ~155 | Same |
| `getUserForAdminManagement` | ~185 | Same |

Semua `db.` references di body harus jadi `ctx.db.`.

**Test:** Admin panel loads normally. Non-admin user passing spoofed admin ID gets "Unauthorized".

#### 2.2 bfcache Reset for 2FA (A4)

**File:** `src/app/(auth)/verify-2fa/page.tsx`
**Change:** Tambah `pageshow` listener di useEffect:
```ts
useEffect(() => {
  const handlePageShow = () => { isSubmitting.current = false }
  window.addEventListener("pageshow", handlePageShow)
  return () => window.removeEventListener("pageshow", handlePageShow)
}, [])
```
**Pattern from:** Sign-in page lines 110-113.

#### 2.3 `pending_2fa` TTL (D6 + S3 interim)

**File:** `src/lib/auth-2fa.ts`

This fix addresses two distinct findings with the same code change:
- **D6 (Durability):** Crash-path gap — jika verify-2fa crash sebelum `clearPending2FA`, stale data persists selama tab hidup.
- **S3 interim (Security):** XSS credential exposure window — plaintext password di sessionStorage tanpa time bound. TTL membatasi window ke 5 menit max.

Full elimination of password from storage is Phase 3 (section 3.3) — requires BetterAuth protocol research.

**Change:**
```ts
// setPending2FA — add expiresAt
const data = { ...pending, expiresAt: Date.now() + 5 * 60 * 1000 }
sessionStorage.setItem(PENDING_2FA_KEY, JSON.stringify(data))

// getPending2FA — check TTL
const data = JSON.parse(raw)
if (data.expiresAt && Date.now() > data.expiresAt) {
  clearPending2FA()
  return null
}
```

#### 2.4 Localhost Origin Production Guard (S6)

**File:** `convex/authOrigins.ts`
**Change:** Guard `isLocalDevOrigin` expansion with environment check:
```ts
// Only allow dynamic localhost origins in development
if (process.env.NODE_ENV !== "production" && isLocalDevOrigin(origin)) {
  return true
}
```

#### 2.5 Delete Dead Code (D1)

**File:** `src/lib/auth-server.ts`
**Change:** Delete `isAuthenticatedFromBetterAuthCookies` function. Grep confirms zero callers. Remove any related exports/types.

#### 2.6 OTT Grace Period — Accept as-is (D4)

**File:** `src/components/chat/ChatContainer.tsx`
**Decision:** No code change. Current 5s timeout is accepted as reasonable per AD-6.

**Rationale:** Verified fix alternatives were rejected:
- Tie to `isSessionPending` — breaks OTT exchange flow (BetterAuth resolves pending before OTT completes).
- No timeout escape if session stays pending indefinitely.

**Monitor:** If Convex cold starts consistently exceed 5s, revisit timeout value. Observable via `[CONTAINER]` console logs + Sentry session error rate.

---

### Phase 3 — Research & Redesign

Tidak di-implement langsung. Masing-masing butuh investigation terlebih dahulu.

#### 3.1 Replace `getUserByBetterAuthId` with `getMyUser` (S2)

**Research:** Verify `getMyUser` returns semua field yang dibutuhkan `useCurrentUser`. Verify `useCurrentUser` callers tidak depend on passing arbitrary `betterAuthUserId`.

**Plan:**
1. Rewire `useCurrentUser` dari `api.users.getUserByBetterAuthId` ke `api.users.getMyUser`
2. Remove `betterAuthUserId` arg dari hook
3. Deprecate lalu delete `getUserByBetterAuthId`

#### 3.2 Turnstile Graceful Degradation (A1)

**Research:** Tentukan policy — apakah deployment tanpa Turnstile is a supported config?

**Plan (jika ya):**
1. Client: jika `!turnstileSiteKey`, skip precheck, langsung call BetterAuth `signIn.magicLink` / `authClient.requestPasswordReset`
2. Server: `email-recovery-precheck/route.ts` return `{ ok: true, status: "no_captcha" }` jika Turnstile unconfigured
3. Rate limiting tetap berlaku di BetterAuth layer

#### 3.3 2FA Password Elimination (S3)

**Research:** Baca BetterAuth `twoFactorCrossDomainBypass` plugin API — apakah ada endpoint yang create session dari bypass token saja tanpa password replay?

**If yes:** Ubah `continueSignInWithBypassToken` untuk tidak perlu password. Hapus `password` dari `Pending2FA` interface.
**If no:** Evaluate: (a) server-side encrypted nonce, (b) memory-only storage (non-persistent), (c) plugin-level PR ke BetterAuth.

#### 3.4 `sendOtp` Rate Limiting (S4)

**Research:** Baca BetterAuth 2FA plugin source code. Cek apakah `/api/auth/2fa/send-otp` punya built-in rate limiting by IP atau email.

**If unprotected:** Tambah rate limiting di Next.js middleware atau Convex HTTP layer. Normalize response untuk prevent email enumeration.

#### 3.5 Tab Wake Session Expiry Check (D2)

**Research:** Determine dimana `expiresAt` tersedia — Better Auth session object? JWT claims? Cookie?

**Plan:**
1. Store `expiresAt` di state saat session resolves
2. Di `handleVisibilityChange`: jika `Date.now() > expiresAt`, lakukan 1x `authClient.getSession({ cache: "no-store" })`
3. Jika session invalid, trigger sign-out redirect
4. Jika session valid, update `expiresAt`
5. Debounce: max 1 live check per 30s

---

## Risk Matrix

| Phase | Finding | Risk jika TIDAK di-fix | Risk jika fix SALAH |
|---|---|---|---|
| 2 | S1 (admin escalation) | **Exploitable sekarang** — any user bisa jadi admin | Low — pattern sudah proven |
| 3 | S2 (user enumeration) | Data exposure — user records queryable tanpa auth | Medium — salah rewire = app-wide user loading break |
| 3 | A1 (Turnstile lockout) | User locked out permanently di deployment tanpa Turnstile | Low — worst case = recovery tanpa captcha |
| 2 | D6/S3 (password in storage) | XSS + credential theft window | Low — TTL hanya restrict, tidak ubah flow |
| 3 | S4 (sendOtp unauthed) | Email bombing + enumeration | Low — research first, BetterAuth mungkin sudah handle |
| 3 | D2 (stale session) | Zombie sessions setelah laptop sleep | Medium — wrong impl = false logouts |
| 2 | D4 (OTT grace 5s) | Cold start > 5s = false redirect | Accepted as-is — no code change (AD-6) |

---

## Out of Scope

- Better Auth library upgrade atau plugin-level changes
- Convex infrastructure rate limiting
- Admin panel UI redesign
- Auth monitoring / alerting
- Hapus `pending_2fa` password entirely (Phase 3 research item)
