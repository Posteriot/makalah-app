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

**Consumers (8 file):**
1. `src/components/ui/SegmentBadge.tsx`
2. `src/components/layout/header/GlobalHeader.tsx`
3. `src/components/settings/StatusTab.tsx`
4. `src/app/(dashboard)/subscription/overview/page.tsx`
5. `src/app/(dashboard)/subscription/plans/page.tsx`
6. `src/components/chat/QuotaWarningBanner.tsx`
7. `src/lib/billing/enforcement.ts`
8. `src/components/chat/ChatSidebar.tsx`

---

## Fix Status Overview

### FIXED (8 lokasi + 1 deleted)

| File | Line | Sebelum | Sesudah | Commit |
|------|------|---------|---------|--------|
| `StatusTab.tsx` | 79 | `convexUser?.subscriptionStatus \|\| "free"` | `getEffectiveTier(convexUser?.role, convexUser?.subscriptionStatus)` | `9eaf104` |
| `SegmentBadge.tsx` | 51 | Local `getSubscriptionTier()` function | Import shared `getEffectiveTier()` | `d9c1509` |
| `GlobalHeader.tsx` | 157 | Local `getSegmentFromUser()` function | Import shared `getEffectiveTier()` | `0b67c20` |
| `overview/page.tsx` | 108 | `user?.subscriptionStatus \|\| "free"` | `getEffectiveTier(user?.role, user?.subscriptionStatus)` | `11c6733` |
| `plans/page.tsx` | 258 | `user.subscriptionStatus \|\| "free"` + isCurrentTier special case | `getEffectiveTier(user.role, user.subscriptionStatus)` + simplified isCurrentTier | `479ff07` |
| `QuotaWarningBanner.tsx` | 49 | `user.subscriptionStatus \|\| "free"` + `tierDisplay` variable | `getEffectiveTier(user.role, user.subscriptionStatus)` | `85a670a` |
| `enforcement.ts` | 128 | `user.subscriptionStatus === "free" ? "gratis" : ...` | Admin early return + `getEffectiveTier()` | `0aa2478` |
| `ChatSidebar.tsx` | 84-88 | Manual role check + raw `subscriptionStatus` (4 conditions) | `getEffectiveTier() !== "pro"` (1 line) | `5d5cc00` |
| `AccountStatusPage.tsx` | — | Raw `subscriptionStatus` display | **Deleted** (dead code, not imported anywhere) | `1d93d8f` |

Patterns applied across all fixes:
- Menghapus entry `"free"` duplicate dari local TIER_CONFIG/TIER_BADGES
- Menambah type annotation `Record<EffectiveTier, ...>` untuk type safety
- Menghapus fallback `|| TIER_CONFIG.gratis` yang tidak diperlukan lagi
- Admin early return di server-side code (`enforcement.ts`)

---

## ALL FRONTEND BUGS FIXED

Semua bug tier determination di frontend dan billing enforcement sudah diperbaiki. Tidak ada lagi lokasi di `src/` yang baca raw `subscriptionStatus` untuk tier determination (kecuali admin panel yang intentional menampilkan raw DB values).

**Remaining raw `subscriptionStatus` reads di `src/` (semua acceptable):**
- `src/lib/utils/subscription.ts` — comment di shared utility (bukan bug)
- `src/components/admin/AdminPanelContainer.tsx` — intentional raw DB stats view
- `src/components/admin/UserList.tsx` — intentional raw DB display

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

## Remaining Items (Nice to Have)

Semua frontend bugs sudah fixed. Item di bawah ini bersifat opsional:

1. **Review `demoteToUser`** — apakah perlu reset `subscriptionStatus` saat demote admin ke user. Saat ini demoted admin tetap punya `subscriptionStatus: "pro"`.
2. **Review Convex backend tier pattern** — 5 lokasi di `quotas.ts` pakai raw pattern (aman karena setelah admin bypass), tapi bisa buat utility serupa di `convex/billing/` untuk konsistensi. Note: Convex runtime tidak bisa import dari `src/lib/utils/`.
3. **Admin panel stats clarity** — `AdminPanelContainer.tsx` counts admin/superadmin sebagai "gratis" di tier stats. Bisa tambah tooltip atau separate count jika ingin lebih akurat.
