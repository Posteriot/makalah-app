# Subscription Tier: File Index

Daftar semua file yang terkait dengan sistem subscription tier di Makalah App.

---

## Database & Backend (Convex)

| File | Relevansi |
|------|-----------|
| `convex/schema.ts` | Schema `users.subscriptionStatus`, `subscriptions`, `creditBalances`, `userQuotas`, `payments` |
| `convex/users.ts` | User creation (default `subscriptionStatus: "free"`), `SubscriptionStatus` type definition |
| `convex/billing/constants.ts` | Tier limits (gratis/bpp/pro), credit pricing, overage rates |
| `convex/billing/quotas.ts` | Quota enforcement — **correctly** bypasses admin/superadmin (line 170, 304, 422) |
| `convex/billing/credits.ts` | BPP credit management — auto-upgrades `"free"` to `"bpp"` on first purchase (line 136-140) |
| `convex/billing/subscriptions.ts` | Pro subscription CRUD — sets `"pro"` on subscribe (line 59), `"free"` on cancel (line 180) |
| `convex/billing/usage.ts` | Usage event recording |

## Shared Hooks & Utilities

| File | Relevansi |
|------|-----------|
| `src/lib/utils/subscription.ts` | **Shared utility**: `getEffectiveTier(role, subscriptionStatus)` — single source of truth |
| `src/lib/hooks/useCurrentUser.ts` | Returns `{ user, isLoading }` — user object contains both `role` and `subscriptionStatus` |
| `src/lib/billing/enforcement.ts` | Pre-flight quota check + post-op usage recording — **BUG**: tier determination ignores role (line 128) |

## UI Components — Tier Display

| File | Tier Logic | Status |
|------|------------|--------|
| `src/components/ui/SegmentBadge.tsx` | Uses shared `getEffectiveTier()` | **Fixed** |
| `src/components/layout/header/GlobalHeader.tsx` | Uses shared `getEffectiveTier()` | **Fixed** |
| `src/components/chat/shell/ShellHeader.tsx` | Pakai SegmentBadge dengan `role` + `subscriptionStatus` (line 60-64) | **Benar** |
| `src/components/settings/StatusTab.tsx` | Uses shared `getEffectiveTier()` | **Fixed** |
| `src/components/chat/QuotaWarningBanner.tsx` | Hanya baca `subscriptionStatus` (line 49) | **BUG** (future fix) |

## Pages — Subscription Management

| File | Tier Logic | Status |
|------|------------|--------|
| `src/app/(account)/settings/page.tsx` | Parent yang pass `convexUser` ke StatusTab | — |
| `src/app/(dashboard)/subscription/overview/page.tsx` | Uses shared `getEffectiveTier()` | **Fixed** |
| `src/app/(dashboard)/subscription/plans/page.tsx` | Uses shared `getEffectiveTier()` | **Fixed** |
| `src/app/(dashboard)/subscription/upgrade/page.tsx` | Pro upgrade page — no tier display logic | OK |

## Admin Panel (display-only, lower priority)

| File | Relevansi |
|------|-----------|
| `src/components/admin/AdminPanelContainer.tsx` | User count by raw `subscriptionStatus` (line 211-214) — kosmetik |
| `src/components/admin/UserList.tsx` | Shows raw `subscriptionStatus` text (line 128) — kosmetik |

## Dokumentasi

| File | Isi |
|------|-----|
| `docs/subscription-tier/data-model.md` | Schema, possible values, subscription flow, tier limits |
| `docs/subscription-tier/tier-determination-logic.md` | Correct pattern, inconsistency audit, fix strategy |
| `docs/subscription-tier/file-index.md` | File ini |
