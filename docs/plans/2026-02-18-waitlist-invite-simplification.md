# Waitlist Invite Simplification — Design Document

**Date:** 2026-02-18
**Branch:** `feat/waiting-list-mode`
**Status:** Approved

## Problem

Sistem undangan waitlist menggunakan BetterAuth magic link yang terlalu rumit:
- Magic link via `auth.api.signInMagicLink()` dari Convex HTTP action
- Dependency pada `SITE_URL` env var (pointing ke remote server, bukan localhost)
- OTT exchange, cross-domain auth, session cookie sync
- Timing issues dan race conditions
- 4+ percobaan gagal karena magic link mengarah ke remote server

## Design Decision

Buang magic link. Ganti dengan plain signup link:

1. **Waiting list** = kumpulkan data antusiasme (nama, email) — sudah ada, tetap sama
2. **Undangan** = kirim email berisi URL langsung ke `/sign-up` — user daftar biasa
3. **Kamuflase** = sign-in page sembunyikan link signup saat waitlist mode ON
4. **Tidak perlu**: magic link, OTT, `SITE_URL` dependency, `waitlistInviteHttp.ts`

## Architecture

```
Admin klik "Undang"
  → WaitlistDashboard panggil Convex action
  → Action: update entry status → "invited" + invitedAt
  → Action: kirim email via Resend dengan link /sign-up
  → Email pakai APP_URL dari Convex env var

User klik link di email
  → Masuk ke /sign-up biasa (Google OAuth atau email/password)
  → useCurrentUser → createAppUser mutation
  → createAppUser cek: email ada di waitlist? → set status "registered"
```

## Key Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Email base URL | Convex env var `APP_URL` | Simple, invite flow 100% di Convex tanpa roundtrip ke Next.js |
| Registration tracking | `createAppUser` mutation | Otomatis untuk semua signup method (Google OAuth, email/password) |
| Signup link visibility | Sembunyikan di sign-in saat waitlist ON | URL tetap accessible langsung, cuma nggak visible |

## Changes Required

### New Code
- Convex action `sendInviteEmail` di `convex/waitlist.ts` — kirim email via Resend
- Email template undangan (Bahasa Indonesia) dengan link ke `{APP_URL}/sign-up`
- Auto-detect registration di `createAppUser` (`convex/users.ts`)

### Modified Code
- `WaitlistDashboard.tsx` — ganti `fetch()` ke HTTP action → `useAction()` ke Convex action
- `sign-in/page.tsx` — sembunyikan link signup saat `isWaitlistMode === true`
- Email konfirmasi waiting list — update teks yang nyebut magic link

### Removed Code
- `convex/waitlistInviteHttp.ts` — entire file
- Route `/api/waitlist/send-invite` di `convex/http.ts`
- `_pendingInvite` flag + `setPendingInvite()` di `convex/auth.ts`
- `sendWaitlistInviteMagicLinkEmail()` di `convex/authEmails.ts`

### Preserved
- `enforceGratisTier` — masih berguna
- `markAsRegistered` — keep sebagai fallback manual
- Toggle `getStartedEnabled` — sudah committed
- BetterAuth `magicLink` plugin — tetap ada untuk use case lain

## Data Flow

### waitlistEntries table lifecycle
```
User isi form waiting list → status: "pending"
Admin klik "Undang"        → status: "invited", invitedAt: timestamp
User sign up via /sign-up  → status: "registered", registeredAt: timestamp
```

### Two separate tables (NOT the same)
- `waitlistEntries` — daftar antrian, bukan akun user
- `users` (BetterAuth + app) — akun sesungguhnya, dibuat saat sign up

## Env Setup Required
```bash
npx convex env set APP_URL http://localhost:3000  # dev
# Production: npx convex env set APP_URL https://makalah.ai
```

## Not Changed
- `FreeLoginGate` / `providers.tsx`
- BetterAuth core config
- Sign-up page logic
- `waitlistEntries` schema (fields tetap sama)
