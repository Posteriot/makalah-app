# Waiting List Feature Design

**Date:** 2026-02-17
**Status:** Approved
**Author:** Claude Code + Erik

## Overview

"Waiting List" adalah jalur frontend alternatif yang diaktifkan saat masa launching publik awal dan testing user. Ketika aktif, seluruh tampilan "Sistem Sekarang" digantikan versi Waiting List — membatasi akses hanya untuk tier gratis, menghilangkan Google OAuth publik, dan memaksa registrasi via waiting list + undangan admin.

## Architecture Decision

**Approach: Server-Side Config + Client Hook (Convex Reactivity)**

- Tabel `appConfig` di Convex menyimpan `waitlistMode: boolean`
- Hook `useWaitlistMode()` query config secara real-time
- Toggle di admin dashboard → instant propagation ke semua client
- Konsisten dengan pattern Convex reactivity yang sudah dipakai

## Data Preservation Guarantee

**Toggle Waiting List = hanya ubah frontend, TIDAK sentuh data user.**

| Skenario | Yang Terjadi |
|----------|-------------|
| WL aktif → admin matikan toggle | Frontend kembali ke "Sistem Sekarang". Semua user tetap ada. |
| User sudah auto-created via invite | Entry di BetterAuth + app users table. Toggle nggak pengaruh. |
| Waitlist entries masih "pending" | Tetap di database. Admin bisa invite kapan saja. |
| Waitlist entries "invited" belum register | Token tetap valid (selama belum expired 7 hari). |
| Dashboard WL setelah toggle off | Tetap bisa diakses admin untuk manage entries. |

**Tidak ada CASCADE DELETE** — toggle off hanya mengubah `appConfig.waitlistMode` dari `true` ke `false`.

---

## Section 1: Database & Backend

### 1a. Tabel Baru: `appConfig`

```
appConfig table:
  key: v.string()          // e.g. "waitlistMode"
  value: v.boolean()       // true/false
  updatedAt: v.number()
  updatedBy: v.string()    // userId admin yang toggle
Index: by_key ["key"] (unique lookup)
```

### 1b. Schema Evolution: `waitlistEntries`

```diff
waitlistEntries:
+ firstName: v.string()
+ lastName: v.string()
  email: v.string()
  status: v.union(v.literal("pending"), v.literal("invited"), v.literal("registered"))
  invitedAt: v.optional(v.number())
  registeredAt: v.optional(v.number())
  inviteToken: v.optional(v.string())
  inviteTokenExpiresAt: v.optional(v.number())
  createdAt: v.number()
```

### 1c. Convex Functions

| Function | Type | Purpose |
|----------|------|---------|
| `appConfig.getWaitlistMode` | query | Return boolean waitlist mode status |
| `appConfig.setWaitlistMode` | mutation | Toggle on/off (admin/superadmin only) |
| `waitlist.register` | mutation | Updated: accept firstName + lastName + email |
| `waitlist.inviteSingle` | mutation | Invite 1 entry (generate token) |
| `waitlist.getByToken` | query | Validate invite token + return entry data |
| `waitlist.markAsRegistered` | mutation | Mark entry as registered after account creation |

### 1d. Auto-Create Account via Invite

Server-side API route `POST /api/accept-invite`:

1. Validate token via `waitlist.getByToken`
2. BetterAuth `admin.createUser({ email, name, emailVerified: true })`
3. Create app user in Convex `users` table (default tier = gratis)
4. `waitlist.markAsRegistered(email)`
5. Generate BetterAuth session → set cookie
6. Return `{ success: true, redirectUrl: "/settings?setPassword=true" }`

---

## Section 2: Frontend Components & Routes

### 2a. Hook

```typescript
// src/lib/hooks/useWaitlistMode.ts
useWaitlistMode() → { isWaitlistMode: boolean, isLoading: boolean }
```

### 2b. Komponen Existing yang Dimodifikasi

| Komponen | File | Perubahan saat WL aktif |
|----------|------|------------------------|
| GlobalHeader | `layout/header/GlobalHeader.tsx` | Hide menu "Blog", hide link "Sign Up" |
| HeroCTA | `marketing/hero/HeroCTA.tsx` | Text "Ikut Daftar Tunggu", link ke `/waiting-list` |
| Hero area | `marketing/hero/` | Tambah teks "Daftarkan email untuk menggunakan Makalah AI, lalu tunggu undangan kami" di atas CTA |
| PricingTeaser | `marketing/pricing-teaser/` | Card BPP+Pro disabled, button "Segera Hadir" |
| PricingPage | `(marketing)/pricing/` | Card BPP+Pro disabled, button "Segera Hadir" |
| GetStartedPage | `(marketing)/get-started/` | Hanya card Gratis aktif |
| Sign-In Page | `(auth)/sign-in/` | Hide Google OAuth, hide "Belum punya akun?" link |
| UserDropdown | `layout/header/UserDropdown.tsx` | Tambah menu "Waiting List" (admin/superadmin only) |

### 2c. Routes Baru

| Route | Purpose | Akses |
|-------|---------|-------|
| `/waiting-list` | Form registrasi (firstName + lastName + email) | Public |
| `/admin-login` | Sign-in khusus admin dengan Google OAuth | Public |
| `/accept-invite` | Handler magic link undangan → auto-create | Public (token-validated) |
| `/dashboard/waitlist` | Dashboard admin Waiting List | Admin/Superadmin only |

### 2d. WaitlistForm Evolution

```
Fields:
  - firstName (required, text)
  - lastName (required, text)
  - email (required, email)
Button: "DAFTAR WAITING LIST"
```

Design meniru halaman sign-in (AuthWideCard layout).

### 2e. Dashboard Waiting List (`/dashboard/waitlist`)

Layout meniru Admin Panel:
- **Header:** "Waiting List" + toggle switch "Aktifkan/Nonaktifkan"
- **Stats row:** Total | Menunggu | Diundang | Terdaftar
- **Tabel:** firstName | lastName | email | status | tanggal | actions
- **Actions per row:** Button "Undang" (pending only) | Button "Hapus"
- Evolusi dari existing `WaitlistManager.tsx` — dipindah dari tab admin panel

### 2f. Halaman `/admin-login`

Halaman minimalis meniru sign-in:
- Hanya tombol "Masuk Dengan Google"
- Teks: "Halaman ini khusus untuk administrator"
- Post-login redirect ke halaman sebelumnya atau `/dashboard`

---

## Section 3: Invite & Account Creation Flow

### 3a. Admin Invite Flow

```
Admin klik "Undang" di dashboard
  → waitlist.inviteSingle(adminUserId, entryId)
  → Generate crypto token (nanoid 32 chars)
  → Set expiry: 7 hari
  → Update entry: status="invited"
  → Server Action: sendWaitlistInviteEmail({ to, firstName, inviteToken })
  → Email via Resend:
    Subject: "Undangan Bergabung - Makalah AI"
    Body: "Halo {firstName}..."
    CTA link: {APP_URL}/accept-invite?token={token}
```

### 3b. Accept Invite Flow

```
User klik link di email
  → GET /accept-invite?token=XXX
  → Validate token via api.waitlist.getByToken(token)
  → Token invalid/expired? → Error page + "Hubungi admin"
  → Token valid? → Loading UI "Menyiapkan akun..."
  → POST /api/accept-invite { token }
    → Re-validate token (server-side)
    → BetterAuth admin.createUser({ email, name, emailVerified: true })
    → Create Convex app user (tier: gratis)
    → waitlist.markAsRegistered(email)
    → Generate session → set cookie
    → Return { redirectUrl: "/settings?setPassword=true" }
  → Redirect ke /settings?setPassword=true
  → Settings page: banner "Buat password" + form
  → User set password → fully onboarded
```

### 3c. Edge Cases

| Case | Handling |
|------|----------|
| Token expired (>7 hari) | Error page + "Hubungi admin untuk undangan baru" |
| Email sudah terdaftar | Error: "Email sudah terdaftar. Silakan masuk." + link sign-in |
| Accept invite tapi nggak set password | Bisa login via magic link |
| Admin resend invite | Generate token baru, kirim email baru |
| User klik link 2x | Pertama berhasil, kedua redirect ke sign-in |

### 3d. Quota Enforcement

User dari waiting list otomatis tier gratis:
- 100 credits/bulan, hard block saat habis
- Enforcement sudah ada via `checkQuotaBeforeOperation()`
- Auto-create account set `subscriptionStatus` = default (gratis)
- **Tidak perlu kode baru** untuk enforcement

---

## Component Dependency Map

```
appConfig.waitlistMode (Convex DB)
    ↓ useWaitlistMode() hook
    ├── GlobalHeader (hide Blog, hide Sign Up link)
    ├── HeroCTA (text + link change)
    ├── Hero area (extra text above CTA)
    ├── PricingTeaser (disable BPP/Pro cards)
    ├── PricingPage (disable BPP/Pro cards)
    ├── GetStartedPage (disable BPP/Pro cards)
    ├── SignInPage (hide Google OAuth, hide sign-up link)
    └── UserDropdown (show "Waiting List" menu for admin)

waitlistEntries (Convex DB)
    ├── /waiting-list page → WaitlistForm → register mutation
    ├── /dashboard/waitlist → WaitlistDashboard → CRUD mutations
    ├── /accept-invite → auto-create flow → API route
    └── Email (Resend) → invite/confirmation emails
```

## Files To Create

- `convex/appConfig.ts` — new table + queries/mutations
- `src/lib/hooks/useWaitlistMode.ts` — client hook
- `src/app/(auth)/admin-login/page.tsx` — admin-only sign-in
- `src/app/(auth)/accept-invite/page.tsx` — invite acceptance page
- `src/app/api/accept-invite/route.ts` — auto-create account API
- `src/app/(dashboard)/dashboard/waitlist/page.tsx` — admin WL dashboard
- `src/components/admin/WaitlistDashboard.tsx` — dashboard UI (evolved from WaitlistManager)

## Files To Modify

- `convex/schema.ts` — add appConfig table, update waitlistEntries
- `convex/waitlist.ts` — update register mutation (firstName, lastName)
- `src/components/auth/WaitlistForm.tsx` — add name fields
- `src/components/layout/header/GlobalHeader.tsx` — conditional menu
- `src/components/layout/header/UserDropdown.tsx` — add WL menu item
- `src/components/marketing/hero/HeroCTA.tsx` — conditional CTA
- `src/components/marketing/pricing-teaser/PricingTeaser.tsx` — disable cards
- `src/app/(marketing)/pricing/page.tsx` — disable cards
- `src/app/(marketing)/get-started/` — disable cards
- `src/app/(auth)/sign-in/` — conditional Google OAuth
- `src/lib/email/resend.ts` — update email templates (include firstName)
- `src/proxy.ts` — add new public routes
- `src/components/admin/adminPanelConfig.ts` — remove waitlist tab
