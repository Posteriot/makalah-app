# Implementation Plan: Auth Hardening

**Date:** 2026-04-21
**Branch:** `access-issues`
**Based on:** `auth-hardening-design-doc.md`
**Implements:** Phase 1 (7 tasks) + Phase 2 (6 tasks). Phase 3 = research only, no implementation.

---

## Execution Rules

1. **One task = one commit.** Setiap task di-commit terpisah untuk isolasi rollback.
2. **Phase 1 dulu, Phase 2 setelah Phase 1 selesai.** Tidak boleh loncat phase.
3. **Within phase, urutan bebas** — semua tasks dalam satu phase independent.
4. **Verify sebelum commit** — setiap task punya verification step yang harus pass.
5. **Phase 3 = research deliverables only** — output berupa dokumen, bukan code.

---

## Phase 1 — Zero Risk Fixes

Semua additive-only. Tidak ada existing behavior yang diubah atau dihapus.

---

### Task 1.1: Strip OTT from URL on Timeout

**Finding:** A2
**AD:** —
**File:** `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`

**Steps:**
1. Baca file, cari useEffect yang handle OTT timeout (cari `setOttTimedOut(true)`)
2. Setelah `setOttTimedOut(true)`, tambah URL cleanup:
   ```ts
   const url = new URL(window.location.href)
   url.searchParams.delete("ott")
   window.history.replaceState({}, "", url.toString())
   ```
3. Verify: `?ott=` param tidak persist di URL bar setelah 5s timeout

**Verification:**
- [ ] `setOttTimedOut(true)` masih dipanggil
- [ ] URL bar bersih dari `?ott=` setelah timeout
- [ ] OTT exchange yang sedang in-flight tidak terganggu (SDK consume token saat mount, bukan dari URL)

---

### Task 1.2: Add `errorCallbackURL` to Google Sign-Up

**Finding:** A7
**AD:** —
**File:** `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

**Steps:**
1. Baca file, cari `signIn.social` call di `handleGoogleSignUp` (line ~41-55)
2. Tambah `errorCallbackURL` pointing ke sign-in page:
   ```ts
   await signIn.social({
     provider: "google",
     callbackURL,
     requestSignUp: true,
     errorCallbackURL: `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`,
   })
   ```
3. Verify: compare dengan sign-in page's `handleGoogleSignIn` — pattern harus konsisten (sign-in sudah punya `errorCallbackURL`)

**Verification:**
- [ ] `errorCallbackURL` ada di `signIn.social()` call
- [ ] Points ke `/sign-in` (bukan `/sign-up`) — karena sign-in sudah handle `?error=signup_disabled`
- [ ] `redirect_url` param preserved via `encodeURIComponent`

---

### Task 1.3: Fix Misleading Error Code

**Finding:** D9
**AD:** —
**File:** `src/app/api/auth/email-recovery-precheck/route.ts`

**Steps:**
1. Baca file, cari catch-all block (line ~213-222) — `catch (error) { ... }`
2. Ganti `code: "CAPTCHA_FAILED"` dengan `code: "SERVICE_UNAVAILABLE"` pada fallback case (non-unauthorized errors)
3. Cek apa yang `"unauthorized"` case saat ini return — verify tidak juga return `CAPTCHA_FAILED`
4. Pastikan actual Turnstile verification failures (earlier in the function) tetap return `CAPTCHA_FAILED`

**Verification:**
- [ ] Catch-all untuk unexpected errors return `SERVICE_UNAVAILABLE`
- [ ] Turnstile-specific failures masih return `CAPTCHA_FAILED`
- [ ] `"unauthorized"` case unchanged

---

### Task 1.4: Password Minimum Hint

**Finding:** A10
**AD:** —
**File:** `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

**Steps:**
1. Baca file, cari password input field (line ~73-76 area, cari `type="password"`)
2. Tambah hint text di bawah password input:
   ```tsx
   <p className="text-xs text-muted-foreground mt-1">Minimal 8 karakter</p>
   ```
3. Pastikan hint muncul di bawah field, bukan di dalam field

**Verification:**
- [ ] Hint visible di bawah password field
- [ ] Styling konsisten (`text-xs text-muted-foreground`)
- [ ] Tidak mengganggu layout existing form elements

---

### Task 1.5: OTP Accessible Labels

**Finding:** A6
**AD:** —
**File:** `src/app/(auth)/verify-2fa/page.tsx`

**Steps:**
1. Baca file, cari `<label className="sr-only">Kode OTP</label>` (line ~409)
2. Tambah `htmlFor="otp-digit-0"` ke label:
   ```tsx
   <label htmlFor="otp-digit-0" className="sr-only">Kode OTP</label>
   ```
3. Cari digit input elements (line ~409-427, di dalam `.map()`)
4. Tambah `id` dan `aria-label` ke setiap input:
   ```tsx
   <input
     id={`otp-digit-${i}`}
     aria-label={`Digit ${i + 1} dari 6`}
     // ... existing props
   />
   ```

**Verification:**
- [ ] `<label>` punya `htmlFor="otp-digit-0"`
- [ ] Setiap input punya `id={`otp-digit-${i}`}`
- [ ] Setiap input punya `aria-label={`Digit ${i + 1} dari 6`}`
- [ ] OTP input behavior unchanged (typing, paste, auto-submit)

---

### Task 1.6: WaitlistForm Accessible Labels

**Finding:** A8
**AD:** —
**File:** `src/components/auth/WaitlistForm.tsx`

**Steps:**
1. Baca file (line ~89-134), identify 3 inputs: first name, last name, email
2. Tambah `id` ke setiap input:
   - `id="waitlist-first-name"`
   - `id="waitlist-last-name"`
   - `id="waitlist-email"`
3. Tambah `<label>` per input (matching sign-up form pattern):
   ```tsx
   <label htmlFor="waitlist-first-name" className="sr-only">Nama depan</label>
   <label htmlFor="waitlist-last-name" className="sr-only">Nama belakang</label>
   <label htmlFor="waitlist-email" className="sr-only">Email</label>
   ```

**Verification:**
- [ ] Setiap input punya `id`
- [ ] Setiap input punya matching `<label htmlFor="...">`
- [ ] Pattern konsisten dengan sign-up form (`className="sr-only"`)
- [ ] Form behavior unchanged (submit, validation, error display)

---

### Task 1.7: WaitlistForm Error Fallback

**Finding:** A9
**AD:** —
**File:** `src/components/auth/WaitlistForm.tsx`

**Steps:**
1. Baca file, cari error handling block (line ~46-53): `if (err instanceof Error) { setError(err.message) }`
2. Import `ConvexError` from `convex/values`
3. Ganti error handling:
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
4. Verify bahwa Convex mutation di `convex/waitlist.ts` throw errors yang kompatibel — cek apakah pakai `ConvexError` atau plain `Error`/`throw new Error(...)`

**Verification:**
- [ ] `ConvexError` imported from `convex/values`
- [ ] Application errors (Indonesian) masih tampil ke user
- [ ] Infrastructure errors (English) di-catch dengan generic Indonesian fallback
- [ ] Tidak pakai regex untuk classify error messages (CLAUDE.md policy)

---

## Phase 2 — Security & Durability Fixes

Perlu targeted testing setelah implementasi.

---

### Task 2.1: Admin JWT Binding (CRITICAL)

**Finding:** S1
**AD:** AD-1
**File:** `convex/users.ts`
**Related:** `convex/permissions.ts`, `convex/authHelpers.ts`

**Steps:**
1. Baca `convex/users.ts`, locate 4 functions:
   - `listAllUsers` (~line 103)
   - `getUserStats` (~line 130)
   - `listUsersPaginated` (~line 155)
   - `getUserForAdminManagement` (~line 185)
2. Untuk setiap function:
   a. Ubah handler signature dari `async ({ db }, { requestorUserId })` ke `async (ctx, { requestorUserId })`
   b. Tambah `await requireAuthUserId(ctx, requestorUserId)` sebagai baris pertama
   c. Ganti semua `db.` references di body menjadi `ctx.db.`
   d. Pastikan `requireRole(ctx.db, requestorUserId, "admin")` tetap ada setelah `requireAuthUserId`
3. Verify import: `requireAuthUserId` dari `./authHelpers` harus sudah di-import (cek existing imports)

**Verification:**
- [ ] Semua 4 handlers pakai `(ctx, ...)` signature
- [ ] Semua 4 handlers call `requireAuthUserId(ctx, requestorUserId)` SEBELUM `requireRole`
- [ ] Semua `db.` references diganti `ctx.db.`
- [ ] `requireAuthUserId` imported
- [ ] Callers verified tetap work:
  - `src/components/admin/UserList.tsx:110` (`listUsersPaginated`)
  - `src/components/admin/AdminOverviewContent.tsx:28` (`getUserStats`)
  - `src/app/api/admin/users/delete/route.ts:54` (`getUserForAdminManagement`)

---

### Task 2.2: bfcache Reset for 2FA

**Finding:** A4
**AD:** —
**File:** `src/app/(auth)/verify-2fa/page.tsx`

**Steps:**
1. Baca file, cari `isSubmitting` ref declaration (`useRef(false)`, ~line 210)
2. Tambah useEffect untuk pageshow listener:
   ```ts
   useEffect(() => {
     const handlePageShow = () => { isSubmitting.current = false }
     window.addEventListener("pageshow", handlePageShow)
     return () => window.removeEventListener("pageshow", handlePageShow)
   }, [])
   ```
3. Verify: pattern matches sign-in page's existing `pageshow` listener (lines 110-113)

**Verification:**
- [ ] `pageshow` event listener added
- [ ] Resets `isSubmitting.current = false`
- [ ] Cleanup function removes listener
- [ ] Empty dependency array `[]`
- [ ] OTP submit still works normally (isSubmitting guard at line ~251 not permanently blocked)

---

### Task 2.3: `pending_2fa` TTL

**Finding:** D6 + S3 (interim)
**AD:** AD-5
**File:** `src/lib/auth-2fa.ts`

Two distinct rationales for same code change:
- **D6:** Crash-path gap — stale data persists jika verify-2fa crash sebelum `clearPending2FA`
- **S3 interim:** XSS credential exposure — plaintext password tanpa time bound

**Steps:**
1. Baca file, cari `setPending2FA` function (~line 17-40)
2. Di `setPending2FA`, tambah `expiresAt` ke stored data:
   ```ts
   const data = { ...pending, expiresAt: Date.now() + 5 * 60 * 1000 }
   sessionStorage.setItem(PENDING_2FA_KEY, JSON.stringify(data))
   ```
3. Cari `getPending2FA` function
4. Setelah `JSON.parse`, tambah TTL check:
   ```ts
   const data = JSON.parse(raw)
   if (data.expiresAt && Date.now() > data.expiresAt) {
     clearPending2FA()
     return null
   }
   ```
5. Verify: 2FA flow masih works — set pending, navigate ke verify-2fa, submit OTP, clear pending

**Verification:**
- [ ] `setPending2FA` stores `expiresAt`
- [ ] `getPending2FA` checks TTL and clears if expired
- [ ] TTL = 5 menit (300000ms), matching OTP TTL
- [ ] Normal 2FA flow unaffected (password available within 5 menit)
- [ ] Expired data returns `null` and calls `clearPending2FA()`

---

### Task 2.4: Localhost Origin Production Guard

**Finding:** S6
**AD:** —
**File:** `convex/authOrigins.ts`

**Steps:**
1. Baca file, cari `isLocalDevOrigin` function (~line 14-23) dan tempat dimana ia dipanggil di `getTrustedOrigins`
2. Guard dynamic localhost expansion dengan environment check:
   ```ts
   if (process.env.NODE_ENV !== "production" && isLocalDevOrigin(origin)) {
     return true
   }
   ```
3. Verify: static trusted origins array (yang sudah include `localhost:3000`, `localhost:3001`) tetap unchanged — ini berlaku di semua environments

**Verification:**
- [ ] `isLocalDevOrigin` expansion guarded with `NODE_ENV !== "production"`
- [ ] Static trusted origins (`:3000`, `:3001`) tetap ada untuk semua environments
- [ ] Dev environment masih bisa pakai any localhost port
- [ ] Production rejects non-standard localhost ports

---

### Task 2.5: Delete Dead Code

**Finding:** D1
**AD:** —
**File:** `src/lib/auth-server.ts`

**Steps:**
1. Baca file, cari `isAuthenticatedFromBetterAuthCookies` function (~line 59-63)
2. Grep codebase untuk confirm zero callers: `grep -r "isAuthenticatedFromBetterAuthCookies" src/ convex/ __tests__/`
3. Jika zero callers confirmed: delete function
4. Cek apakah function di-export — jika ya, hapus dari exports juga
5. Cek apakah ada type definitions terkait yang perlu dihapus

**Verification:**
- [ ] Grep confirms zero callers (selain definition sendiri)
- [ ] Function deleted
- [ ] Export removed (jika ada)
- [ ] No TypeScript compilation errors
- [ ] `isAuthenticated()` function (yang dipakai aktif) TIDAK tersentuh

---

### Task 2.6: OTT Grace Period — No Code Change

**Finding:** D4
**AD:** AD-6
**File:** `src/components/chat/ChatContainer.tsx`

**Steps:**
- No code change. Accepted as-is per AD-6.
- Document monitoring approach: jika Convex cold starts consistently > 5s, revisit timeout value.

**Verification:**
- [ ] No code changes made to `ChatContainer.tsx` for this task
- [ ] 5s timeout still in place, unchanged

---

## Phase 3 — Research Deliverables (No Code)

Setiap task menghasilkan dokumen research, bukan code changes.

---

### Task 3.1: Research `getUserByBetterAuthId` Replacement

**Finding:** S2
**AD:** AD-2
**Output:** `docs/access-issues/research-s2-getMyUser-replacement.md`

**Research questions:**
1. Apakah `getMyUser` return semua field yang dibutuhkan `useCurrentUser`? Bandingkan return type.
2. Apakah ada caller `useCurrentUser` yang depend on passing arbitrary `betterAuthUserId`?
3. Apa impact rewiring ke `getMyUser` terhadap initial load performance? (`getMyUser` pakai `ctx.auth.getUserIdentity()` which requires Convex auth token — apakah token tersedia di timing yang sama?)

**Deliverable:** Go/no-go decision + implementation steps jika go.

---

### Task 3.2: Research Turnstile Graceful Degradation

**Finding:** A1
**AD:** AD-3
**Output:** `docs/access-issues/research-a1-turnstile-degradation.md`

**Research questions:**
1. Apakah deployment tanpa Turnstile is a supported configuration? (cek docs, .env.example)
2. Apa BetterAuth rate limiting behavior untuk `signIn.magicLink` dan `requestPasswordReset`?
3. Jika bypass precheck, apakah email enumeration menjadi possible via response timing?

**Deliverable:** Policy decision + client/server implementation plan.

---

### Task 3.3: Research 2FA Password Elimination

**Finding:** S3
**AD:** AD-5
**Output:** `docs/access-issues/research-s3-2fa-password-elimination.md`

**Research questions:**
1. Baca BetterAuth `twoFactorCrossDomainBypass` plugin API — apakah bypass token bisa create session tanpa password replay?
2. Trace implementasi lokal yang menggunakan plugin ini — cari endpoint alternatif
3. Jika tidak bisa: evaluate (a) server-side encrypted nonce, (b) memory-only storage, (c) BetterAuth plugin PR

**Deliverable:** Feasibility assessment + chosen approach.

---

### Task 3.4: Research `sendOtp` Rate Limiting

**Finding:** S4
**AD:** —
**Output:** `docs/access-issues/research-s4-sendotp-ratelimit.md`

**Research questions:**
1. Baca BetterAuth 2FA plugin source — apakah `/api/auth/2fa/send-otp` punya built-in rate limiting?
2. Cek Convex HTTP handler — apakah ada rate limiting di layer itu?
3. Apakah response berbeda untuk registered vs unregistered email? (email enumeration risk)

**Deliverable:** Vulnerability confirmation + fix plan jika confirmed.

---

### Task 3.5: Research Tab Wake Session Expiry Check

**Finding:** D2
**AD:** AD-4
**Output:** `docs/access-issues/research-d2-tab-wake-expiry.md`

**Research questions:**
1. Di mana `expiresAt` tersedia? Better Auth session object? JWT claims? Cookie?
2. Berapa typical session TTL dari BetterAuth config?
3. Apakah `authClient.getSession({ cache: "no-store" })` reliably return fresh session status?
4. Debounce strategy: 30s minimum interval cukup? Atau perlu adaptive?

**Deliverable:** Technical design for expiry-based approach.

---

## Commit Strategy

```
Phase 1 (7 commits):
  fix(auth): strip OTT param from URL on timeout (A2)
  fix(auth): add errorCallbackURL to Google sign-up (A7)
  fix(auth): return SERVICE_UNAVAILABLE for non-captcha errors (D9)
  fix(auth): add password minimum hint on sign-up (A10)
  fix(a11y): add accessible labels to OTP digit inputs (A6)
  fix(a11y): add accessible labels to WaitlistForm inputs (A8)
  fix(auth): use ConvexError for WaitlistForm error handling (A9)

Phase 2 (5 commits — task 2.6 has no code change):
  fix(security): bind admin queries to JWT identity (S1)
  fix(auth): reset isSubmitting on bfcache restore in 2FA page (A4)
  fix(security): add TTL to pending_2fa sessionStorage (D6/S3)
  fix(security): guard localhost origin expansion in production (S6)
  refactor(auth): delete unused isAuthenticatedFromBetterAuthCookies (D1)
```

---

## Traceability Matrix

| Task | Finding | AD | Phase | File | Code Change? |
|---|---|---|---|---|---|
| 1.1 | A2 | — | 1 | `sign-in/page.tsx` | Yes |
| 1.2 | A7 | — | 1 | `sign-up/page.tsx` | Yes |
| 1.3 | D9 | — | 1 | `email-recovery-precheck/route.ts` | Yes |
| 1.4 | A10 | — | 1 | `sign-up/page.tsx` | Yes |
| 1.5 | A6 | — | 1 | `verify-2fa/page.tsx` | Yes |
| 1.6 | A8 | — | 1 | `WaitlistForm.tsx` | Yes |
| 1.7 | A9 | — | 1 | `WaitlistForm.tsx` | Yes |
| 2.1 | S1 | AD-1 | 2 | `convex/users.ts` | Yes |
| 2.2 | A4 | — | 2 | `verify-2fa/page.tsx` | Yes |
| 2.3 | D6+S3 | AD-5 | 2 | `auth-2fa.ts` | Yes |
| 2.4 | S6 | — | 2 | `convex/authOrigins.ts` | Yes |
| 2.5 | D1 | — | 2 | `auth-server.ts` | Yes (delete) |
| 2.6 | D4 | AD-6 | 2 | `ChatContainer.tsx` | No |
| 3.1 | S2 | AD-2 | 3 | — | Research only |
| 3.2 | A1 | AD-3 | 3 | — | Research only |
| 3.3 | S3 | AD-5 | 3 | — | Research only |
| 3.4 | S4 | — | 3 | — | Research only |
| 3.5 | D2 | AD-4 | 3 | — | Research only |
