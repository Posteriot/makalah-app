# Subscription Tier: File Index

> Daftar lengkap semua file yang terkait dengan sistem subscription tier di Makalah App.
> Status menunjukkan apakah file sudah menggunakan `getEffectiveTier()` shared utility.
> Digunakan sebagai konteks oleh Claude Code saat bekerja pada fitur terkait billing/subscription.

---

## Shared Utility

| File | Deskripsi |
|------|-----------|
| `src/lib/utils/subscription.ts` | **Single source of truth**: `getEffectiveTier(role, subscriptionStatus)` → `EffectiveTier` type. Commit `a40d8d6`. |

---

## Frontend — Tier Display (UI Components)

| File | Tier Logic | Status |
|------|------------|--------|
| `src/components/ui/SegmentBadge.tsx` | Uses `getEffectiveTier()` | **Fixed** (`d9c1509`) |
| `src/components/layout/header/GlobalHeader.tsx` | Uses `getEffectiveTier()` | **Fixed** (`0b67c20`) |
| `src/components/chat/shell/ShellHeader.tsx` | Delegates ke SegmentBadge (line 102) | **Benar** (indirect) |
| `src/components/settings/StatusTab.tsx` | Uses `getEffectiveTier()` | **Fixed** (`9eaf104`) |
| `src/components/chat/QuotaWarningBanner.tsx` | Raw `subscriptionStatus` (line 49) | **BUG** — admin lihat warning + "Upgrade" |
| `src/components/user/AccountStatusPage.tsx` | Raw `subscriptionStatus` (line 56) | **BUG** — admin lihat "Free" |
| `src/components/chat/ChatSidebar.tsx` | Manual role check + raw `subscriptionStatus` (line 84-88) | **Aman** (role check benar, tapi bisa DRY) |

---

## Frontend — Subscription Pages

| File | Tier Logic | Status |
|------|------------|--------|
| `src/app/(account)/settings/page.tsx` | Parent: pass `convexUser` ke StatusTab | OK |
| `src/app/(dashboard)/subscription/overview/page.tsx` | Uses `getEffectiveTier()` | **Fixed** (`11c6733`) |
| `src/app/(dashboard)/subscription/plans/page.tsx` | Uses `getEffectiveTier()` | **Fixed** (`479ff07`) |
| `src/app/(dashboard)/subscription/upgrade/page.tsx` | No tier display logic | OK |
| `src/app/(dashboard)/subscription/layout.tsx` | Layout wrapper, no tier logic | OK |
| `src/app/(dashboard)/subscription/page.tsx` | Redirect only | OK |
| `src/app/(dashboard)/subscription/history/page.tsx` | Usage history display, no tier determination | OK |
| `src/app/(dashboard)/subscription/topup/page.tsx` | Topup flow, no tier determination | OK |
| `src/app/(dashboard)/subscription/topup/success/page.tsx` | Success page, no tier logic | OK |
| `src/app/(dashboard)/subscription/topup/failed/page.tsx` | Failed page, no tier logic | OK |

---

## Frontend — Billing Enforcement

| File | Tier Logic | Status |
|------|------------|--------|
| `src/lib/billing/enforcement.ts` | Raw `subscriptionStatus` (line 128) | **BUG** — admin tier salah saat recording |

---

## Backend — Convex Billing

| File | Tier Logic | Status |
|------|------------|--------|
| `convex/billing/quotas.ts` | Admin bypass di 3 functions (line 170, 304, 422). Raw tier pattern di 5 lokasi (setelah bypass). | **Benar** (bypass melindungi admin) |
| `convex/billing/credits.ts` | Auto-upgrade `"free"` → `"bpp"` saat beli credit (line 136-140, 166-168) | **Benar** |
| `convex/billing/subscriptions.ts` | Set `"pro"` on subscribe (line 59), `"free"` on cancel (line 180-183) | **Benar** |
| `convex/billing/usage.ts` | Usage event recording, no tier logic | OK |
| `convex/billing/constants.ts` | Tier limits config (`TIER_LIMITS`), `TierType` definition | OK |

---

## Backend — Convex User Management

| File | Relevansi | Status |
|------|-----------|--------|
| `convex/schema.ts` | `users.subscriptionStatus` field definition (line 57) | OK |
| `convex/users.ts` | User creation: default `subscriptionStatus: "free"` (line 77), `SubscriptionStatus` type (line 6) | OK |
| `convex/adminUserManagement.ts` | `promoteToAdmin`: set `subscriptionStatus: "pro"` (line 54). `demoteToUser`: **TIDAK reset** `subscriptionStatus` (line 112-115) | **Edge case** |
| `convex/adminManualUserCreation.ts` | Manual user creation: admin dibuat dengan `subscriptionStatus: "pro"` (line 60) | OK |
| `convex/billing/payments.ts` | Payment tracking | OK |

---

## Admin Panel (display-only)

| File | Relevansi | Status |
|------|-----------|--------|
| `src/components/admin/AdminPanelContainer.tsx` | User count by raw `subscriptionStatus` (line 210-214) | **Kosmetik** (intentional raw DB view) |
| `src/components/admin/UserList.tsx` | Shows raw `subscriptionStatus` text (line 128) | **Kosmetik** (intentional raw DB view) |

---

## Hooks & Utilities

| File | Relevansi |
|------|-----------|
| `src/lib/hooks/useCurrentUser.ts` | Returns `{ user, isLoading }` — user object berisi `role` dan `subscriptionStatus` |
| `src/lib/hooks/usePermissions.ts` | Role-based permission check, tidak terkait tier display |

---

## Summary Status

| Status | Count | Files |
|--------|-------|-------|
| **Fixed** | 5 | SegmentBadge, GlobalHeader, StatusTab, overview, plans |
| **BUG** | 3 | QuotaWarningBanner, enforcement.ts, AccountStatusPage |
| **Aman (bisa DRY)** | 1 | ChatSidebar |
| **Kosmetik** | 2 | AdminPanelContainer, UserList |
| **Edge case** | 1 | demoteToUser (tidak reset subscriptionStatus) |
| **Benar** | 9 | ShellHeader, quotas.ts, credits.ts, subscriptions.ts, dll |
| **OK (no tier logic)** | 11 | Layout, redirect, history, topup pages, dll |

---

## Dokumentasi

| File | Isi |
|------|-----|
| `docs/subscription-tier/data-model.md` | Schema, possible values, flows, tier limits, backend bypass, role vs subscriptionStatus |
| `docs/subscription-tier/tier-determination-logic.md` | Shared utility, fix status, remaining bugs detail, recommendations |
| `docs/subscription-tier/file-index.md` | File ini — index lengkap semua file terkait |

---

## Plans yang Sudah Dieksekusi

| Plan | Tasks | Status |
|------|-------|--------|
| `docs/plans/2026-02-08-subscription-tier-consistency.md` | 5 tasks: create utility, fix StatusTab, refactor SegmentBadge, refactor GlobalHeader, verify | **Selesai** |
| `docs/plans/2026-02-08-subscription-pages-tier-fix.md` | 3 tasks: fix overview, fix plans, verify + update docs | **Selesai** |
