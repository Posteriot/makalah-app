# Subscription Tier: Determination Logic & Fix Status

> Dokumen ini menjelaskan logika penentuan tier, shared utility yang digunakan,
> status perbaikan di seluruh codebase, dan remaining bugs yang perlu di-fix.
> Digunakan sebagai konteks oleh Claude Code saat bekerja pada fitur terkait billing/subscription.

---

## Shared Utility: `getEffectiveTier()`

**File:** `src/lib/utils/subscription.ts`
**Created:** commit `a40d8d6`

```typescript
export type EffectiveTier = "gratis" | "bpp" | "pro"

export function getEffectiveTier(role?: string, subscriptionStatus?: string): EffectiveTier {
  // Admin and superadmin are always treated as PRO (unlimited access)
  if (role === "superadmin" || role === "admin") return "pro"

  // Regular users: check subscriptionStatus
  if (subscriptionStatus === "pro") return "pro"
  if (subscriptionStatus === "bpp") return "bpp"

  return "gratis" // default for "free", "canceled", undefined
}
```

**Kenapa utility ini diperlukan:**
- Admin/superadmin di database tetap `subscriptionStatus: "free"` (default saat user creation via webhook)
- Tidak ada mutation yang auto-update field ini berdasarkan role (kecuali `promoteToAdmin` yang set `"pro"`)
- Backend Convex sudah bypass quota untuk admin, tapi frontend display banyak yang tidak
- Utility ini menggantikan duplicate logic dan menjadi single source of truth

**Consumers (6 file):**
1. `src/components/ui/SegmentBadge.tsx`
2. `src/components/layout/header/GlobalHeader.tsx`
3. `src/components/settings/StatusTab.tsx`
4. `src/app/(dashboard)/subscription/overview/page.tsx`
5. `src/app/(dashboard)/subscription/plans/page.tsx`

---

## Fix Status Overview

### FIXED (5 lokasi)

| File | Line | Sebelum | Sesudah | Commit |
|------|------|---------|---------|--------|
| `StatusTab.tsx` | 79 | `convexUser?.subscriptionStatus \|\| "free"` | `getEffectiveTier(convexUser?.role, convexUser?.subscriptionStatus)` | `9eaf104` |
| `SegmentBadge.tsx` | 51 | Local `getSubscriptionTier()` function | Import shared `getEffectiveTier()` | `d9c1509` |
| `GlobalHeader.tsx` | 157 | Local `getSegmentFromUser()` function | Import shared `getEffectiveTier()` | `0b67c20` |
| `overview/page.tsx` | 108 | `user?.subscriptionStatus \|\| "free"` | `getEffectiveTier(user?.role, user?.subscriptionStatus)` | `11c6733` |
| `plans/page.tsx` | 258 | `user.subscriptionStatus \|\| "free"` + isCurrentTier special case | `getEffectiveTier(user.role, user.subscriptionStatus)` + simplified isCurrentTier | `479ff07` |

Semua lokasi fixed juga:
- Menghapus entry `"free"` duplicate dari local TIER_CONFIG/TIER_BADGES
- Menambah type annotation `Record<EffectiveTier, ...>` untuk type safety
- Menghapus fallback `|| TIER_CONFIG.gratis` yang tidak diperlukan lagi

---

## REMAINING BUGS (3 lokasi)

### Bug 1: `QuotaWarningBanner.tsx` — Prioritas TINGGI

**File:** `src/components/chat/QuotaWarningBanner.tsx`
**Line:** 49-50

```typescript
const tier = user.subscriptionStatus || "free"
const tierDisplay = tier === "free" ? "gratis" : tier
```

**Impact:** Admin/superadmin dengan `subscriptionStatus: "free"`:
- `tier` = `"free"` → `tierDisplay` = `"gratis"`
- Masuk branch `if (tierDisplay === "gratis" || tierDisplay === "pro")` (line 58)
- Jika quota data menunjukkan usage tinggi → muncul banner "Kuota habis. **Upgrade** ke Pro"
- Admin seharusnya TIDAK PERNAH melihat quota warning

**Fix yang diperlukan:**
```typescript
import { getEffectiveTier } from "@/lib/utils/subscription"
// ...
const tier = getEffectiveTier(user.role, user.subscriptionStatus)
```
Lalu hapus `tierDisplay` variable, pakai `tier` langsung. Tambahkan early return untuk `tier === "pro"` karena PRO (termasuk admin) tidak perlu warning banner tentang upgrade.

**Catatan tambahan:** Setelah fix, perlu juga review apakah Pro users butuh warning untuk overage. Saat ini logic hanya handle quota-based warning (gratis/pro) dan credit-based warning (bpp).

---

### Bug 2: `enforcement.ts` — Prioritas TINGGI

**File:** `src/lib/billing/enforcement.ts`
**Line:** 128

```typescript
const tier = user.subscriptionStatus === "free" ? "gratis" : user.subscriptionStatus
```

**Context:** Ini di dalam `recordUsageAfterOperation()`, dipanggil setelah AI response selesai untuk deduct quota/credits.

**Impact:** Admin/superadmin dengan `subscriptionStatus: "free"`:
- `tier` = `"gratis"`
- Masuk branch `else` (line 154-159) → deduct dari quota bucket "gratis"
- Seharusnya tier `"pro"` → deduct dari quota bucket "pro" (atau skip karena admin)

**Mitigasi yang sudah ada:**
- Backend `deductQuota()` di Convex sudah punya admin bypass (line 170-172), jadi deduction mungkin di-bypass oleh backend
- Tapi `recordUsageAfterOperation()` di frontend tetap salah menentukan tier, bisa menyebabkan wrong bucket deduction jika backend bypass tidak trigger

**Fix yang diperlukan:**
```typescript
import { getEffectiveTier } from "@/lib/utils/subscription"
// ...
// Di recordUsageAfterOperation(), line 128:
const tier = getEffectiveTier(user.role, user.subscriptionStatus)
```
Setelah fix, logic `if (tier === "bpp")` dan `else` (gratis/pro) tetap benar karena admin jadi tier `"pro"` dan masuk branch deduct quota (yang akan di-bypass oleh backend).

**Alternatif lebih baik:** Tambahkan early return untuk admin di `recordUsageAfterOperation()` sendiri, sebelum tier determination. Mirip pattern di `isAdminUser()` yang sudah ada di file yang sama (line 198-202).

---

### Bug 3: `AccountStatusPage.tsx` — Prioritas SEDANG

**File:** `src/components/user/AccountStatusPage.tsx`
**Line:** 56

```typescript
{user.subscriptionStatus || "Free"}
```

**Context:** Custom page di dalam Clerk `<UserButton.UserProfilePage />`. Menampilkan raw `subscriptionStatus` dengan capitalize.

**Impact:** Admin/superadmin melihat "Free" atau "free" sebagai subscription status, bukan "Pro".

**Fix yang diperlukan:**
```typescript
import { getEffectiveTier } from "@/lib/utils/subscription"
// ...
// Bisa pakai SegmentBadge component atau getEffectiveTier + display mapping
const tier = getEffectiveTier(user.role, user.subscriptionStatus)
```

**Catatan:** Component ini mungkin sudah obsolete karena settings page baru (`/settings`) sudah ada dengan StatusTab yang sudah di-fix. Perlu verifikasi apakah `AccountStatusPage` masih dipakai di mana saja, atau bisa dihapus.

---

## SAFE BUT COULD USE DRY (1 lokasi)

### `ChatSidebar.tsx` — Prioritas RENDAH

**File:** `src/components/chat/ChatSidebar.tsx`
**Line:** 84-88

```typescript
const showUpgradeCTA =
    user &&
    user.role !== "admin" &&
    user.role !== "superadmin" &&
    (user.subscriptionStatus === "bpp" || user.subscriptionStatus === "free")
```

**Status: BUKAN BUG.** Logic ini sudah cek `role !== "admin" && role !== "superadmin"` secara eksplisit sebelum baca `subscriptionStatus`. Admin/superadmin tidak akan pernah lihat upgrade CTA.

**Minor issue:** Hanya handle `"free"` dan `"bpp"`, tidak `"gratis"` (tapi `"gratis"` tidak pernah ada di DB saat ini, jadi tidak jadi masalah nyata).

**Optional DRY refactor:**
```typescript
const tier = getEffectiveTier(user.role, user.subscriptionStatus)
const showUpgradeCTA = user && tier !== "pro"
```

Ini lebih bersih, lebih aman terhadap perubahan masa depan, dan konsisten dengan pattern di seluruh codebase.

---

## KOSMETIK / KONTEKS BERBEDA (2 lokasi)

### `AdminPanelContainer.tsx` — BUKAN BUG

**File:** `src/components/admin/AdminPanelContainer.tsx`
**Line:** 210-214

```typescript
const gratisCount = users.filter(
    (u) => !u.subscriptionStatus || u.subscriptionStatus === "free" || u.subscriptionStatus === "gratis"
).length
const bppCount = users.filter((u) => u.subscriptionStatus === "bpp").length
const proCount = users.filter((u) => u.subscriptionStatus === "pro").length
```

**Konteks:** Ini menghitung raw DB values untuk statistik admin panel overview. Admin memang perlu lihat distribusi actual `subscriptionStatus` di database. Superadmin yang punya `subscriptionStatus: "free"` memang dihitung sebagai gratis — ini data yang akurat dari perspektif DB.

**Awareness:** Angka `gratisCount` bisa misleading karena termasuk admin/superadmin, tapi ini acceptable untuk admin view. Jika ingin lebih akurat, bisa tambah tooltip "termasuk admin yang belum di-set ke pro".

### `UserList.tsx` — BUKAN BUG

**File:** `src/components/admin/UserList.tsx`
**Line:** 128

Menampilkan raw `subscriptionStatus` text di tabel user admin. Ini intentional — admin melihat actual DB value untuk management purposes.

---

## Convex Backend Tier Patterns

### Admin Bypass (Sudah Benar)

3 functions di `convex/billing/quotas.ts` sudah punya admin bypass:

| Function | Line | Return |
|----------|------|--------|
| `deductQuota()` | 170-172 | `{ success: true, bypassed: true }` |
| `checkQuota()` | 304-306 | `{ allowed: true, tier: "pro" }` |
| `getQuotaStatus()` | 422-429 | `{ tier: "pro", unlimited: true }` |

### Raw Tier Pattern di Backend

5 lokasi di `quotas.ts` pakai raw pattern (selalu **setelah** admin bypass, jadi tidak bug):
- Line 64 (`getUserQuota`)
- Line 105 (internal)
- Line 186 (`deductQuota`, setelah admin bypass)
- Line 309 (`checkQuota`, setelah admin bypass)
- Line 432 (`getQuotaStatus`, setelah admin bypass)

Pattern: `(user.subscriptionStatus === "free" ? "gratis" : user.subscriptionStatus) as TierType`

**Catatan:** Convex functions tidak bisa import dari `src/lib/utils/` (berbeda runtime). Jika ingin konsisten, perlu buat utility serupa di `convex/billing/` directory.

### Admin Management Mutations

| Mutation | File | Effect |
|----------|------|--------|
| `promoteToAdmin` | `convex/adminUserManagement.ts:52-54` | Set `role: "admin"` + `subscriptionStatus: "pro"` |
| `demoteToUser` | `convex/adminUserManagement.ts:112-115` | Set `role: "user"` tapi **TIDAK reset** `subscriptionStatus` |
| `createManualUser` | `convex/adminManualUserCreation.ts:60` | Admin user dibuat dengan `subscriptionStatus: "pro"` |

**Edge case `demoteToUser`:** Admin yang di-demote tetap punya `subscriptionStatus: "pro"`. Bisa intentional (mereka tetap Pro subscriber), tapi bisa misleading jika mereka belum pernah bayar.

---

## Upgrade Button Rules

| Effective Tier | Show Upgrade? | Link Tujuan |
|---------------|---------------|-------------|
| gratis | Ya | `/subscription/upgrade` |
| bpp | Ya | `/subscription/upgrade` |
| pro | Tidak | — |

**Admin/superadmin:** Effective tier = PRO → tidak pernah lihat tombol Upgrade.

---

## Rekomendasi Fix Berikutnya

**Prioritas 1 (bug dengan user-facing impact):**
1. Fix `QuotaWarningBanner.tsx` — admin bisa lihat warning + upgrade CTA yang salah
2. Fix `enforcement.ts` — tier determination salah saat recording usage

**Prioritas 2 (bug minor + cleanup):**
3. Fix atau hapus `AccountStatusPage.tsx` — cek dulu apakah masih dipakai
4. DRY refactor `ChatSidebar.tsx` — optional tapi meningkatkan konsistensi

**Prioritas 3 (nice to have):**
5. Review `demoteToUser` — apakah perlu reset `subscriptionStatus` saat demote
6. Review Convex backend tier pattern — buat utility serupa di `convex/billing/` jika ingin konsisten
