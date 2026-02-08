# Fix Subscription Pages Tier Consistency — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the 2 remaining subscription pages that still use raw `subscriptionStatus` instead of `getEffectiveTier()`, completing the codebase-wide tier consistency fix.

**Architecture:** Same pattern as the previous plan (`2026-02-08-subscription-tier-consistency.md`, already executed). Import `getEffectiveTier` from the shared utility created in that plan, replace raw `subscriptionStatus` reads, remove duplicate `"free"` entries from local tier configs, and simplify conditional logic that handled `"free"` as a separate case.

**Tech Stack:** TypeScript, React, Next.js, Convex (useCurrentUser hook)

**Reference:** `docs/subscription-tier/` — data model, tier logic audit, file index

**Prerequisite:** `src/lib/utils/subscription.ts` with `getEffectiveTier()` already exists (created in previous plan).

---

### Task 1: Fix subscription overview page

**Files:**
- Modify: `src/app/(dashboard)/subscription/overview/page.tsx`

**Context:** This page shows the user's current tier, usage stats, and an "Upgrade ke Pro" link. Currently reads raw `subscriptionStatus` (line 112), causing admin/superadmin to appear as GRATIS with an upgrade CTA.

**Step 1: Apply the fix**

Changes needed in `overview/page.tsx`:

1. Add import at top (after existing imports, before TIER_CONFIG):
```typescript
import { getEffectiveTier } from "@/lib/utils/subscription"
import type { EffectiveTier } from "@/lib/utils/subscription"
```

2. Replace local `TIER_CONFIG` (lines 21-46) — remove `"free"` duplicate entry and add type annotation:

Before:
```typescript
const TIER_CONFIG = {
  gratis: {
    label: "GRATIS",
    description: "Akses dasar dengan limit",
    color: "bg-segment-gratis",
    textColor: "text-segment-gratis",
  },
  free: {
    label: "GRATIS",
    description: "Akses dasar dengan limit",
    color: "bg-segment-gratis",
    textColor: "text-segment-gratis",
  },
  bpp: { ... },
  pro: { ... },
}
```

After:
```typescript
const TIER_CONFIG: Record<EffectiveTier, { label: string; description: string; color: string; textColor: string }> = {
  gratis: {
    label: "GRATIS",
    description: "Akses dasar dengan limit",
    color: "bg-segment-gratis",
    textColor: "text-segment-gratis",
  },
  bpp: {
    label: "BPP",
    description: "Bayar Per Paper",
    color: "bg-segment-bpp",
    textColor: "text-segment-bpp",
  },
  pro: {
    label: "PRO",
    description: "Akses penuh tanpa batas",
    color: "bg-segment-pro",
    textColor: "text-segment-pro",
  },
}
```

3. Replace tier determination (line 112-113):

Before:
```typescript
const tier = (user?.subscriptionStatus || "free") as keyof typeof TIER_CONFIG
const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.gratis
```

After:
```typescript
const tier = getEffectiveTier(user?.role, user?.subscriptionStatus)
const tierConfig = TIER_CONFIG[tier]
```

No fallback needed — `getEffectiveTier` always returns a valid `EffectiveTier` key.

4. Line 175 — `tier !== "pro"` check for upgrade link: **No change needed.** This already works correctly because `getEffectiveTier` returns `"pro"` for admin, so the link will be hidden.

**Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/subscription/overview/page.tsx
git commit -m "fix(subscription): use getEffectiveTier in overview page

Admin/superadmin now correctly shows PRO tier instead of GRATIS.
Upgrade CTA hidden for admin users. Remove duplicate 'free' entry."
```

---

### Task 2: Fix subscription plans page

**Files:**
- Modify: `src/app/(dashboard)/subscription/plans/page.tsx`

**Context:** This page shows all available plans with the user's current tier highlighted. Currently reads raw `subscriptionStatus` (line 257), causing admin to see wrong "current tier" badge and incorrect plan highlighting.

**Step 1: Apply the fix**

Changes needed in `plans/page.tsx`:

1. Add import at top (after existing imports, before types section):
```typescript
import { getEffectiveTier } from "@/lib/utils/subscription"
import type { EffectiveTier } from "@/lib/utils/subscription"
```

2. Replace local `TIER_BADGES` (lines 92-97) — remove `"free"` duplicate and add type annotation:

Before:
```typescript
const TIER_BADGES = {
  gratis: { label: "GRATIS", color: "bg-segment-gratis" },
  free: { label: "GRATIS", color: "bg-segment-gratis" },
  bpp: { label: "BPP", color: "bg-segment-bpp" },
  pro: { label: "PRO", color: "bg-segment-pro" },
}
```

After:
```typescript
const TIER_BADGES: Record<EffectiveTier, { label: string; color: string }> = {
  gratis: { label: "GRATIS", color: "bg-segment-gratis" },
  bpp: { label: "BPP", color: "bg-segment-bpp" },
  pro: { label: "PRO", color: "bg-segment-pro" },
}
```

3. Replace tier determination (line 257-258):

Before:
```typescript
const currentTier = (user.subscriptionStatus || "free") as keyof typeof TIER_BADGES
const tierBadge = TIER_BADGES[currentTier] || TIER_BADGES.gratis
```

After:
```typescript
const currentTier = getEffectiveTier(user.role, user.subscriptionStatus)
const tierBadge = TIER_BADGES[currentTier]
```

4. Simplify `isCurrentTier` logic (lines 299-301) — remove `"free"` special case:

Before:
```typescript
const isCurrentTier =
  (plan.slug === "gratis" && (currentTier === "gratis" || currentTier === "free")) ||
  (plan.slug === currentTier)
```

After:
```typescript
const isCurrentTier = plan.slug === currentTier
```

This works because `getEffectiveTier` normalizes `"free"` → `"gratis"`, and the plan slug for the free tier is `"gratis"`. No more need for the `|| currentTier === "free"` special case.

**Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/subscription/plans/page.tsx
git commit -m "fix(subscription): use getEffectiveTier in plans page

Admin/superadmin now correctly highlighted as PRO tier.
Simplify isCurrentTier logic since getEffectiveTier normalizes
'free' to 'gratis'. Remove duplicate 'free' entry from TIER_BADGES."
```

---

### Task 3: Build verification + update documentation

**Files:**
- Verify: full build + lint
- Modify: `docs/subscription-tier/file-index.md` (update bug status)

**Step 1: Full production build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds, no errors

**Step 2: Lint**

Run: `npm run lint 2>&1 | tail -10`
Expected: 0 errors

**Step 3: Grep for remaining raw subscriptionStatus reads**

Run: `grep -rn "subscriptionStatus.*free\|subscriptionStatus.*||" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v ".d.ts"`

Review results — remaining hits should only be in files noted as "future fix" (QuotaWarningBanner.tsx, billing/enforcement.ts, admin panel files).

**Step 4: Verify getEffectiveTier usage**

Run: `grep -rn "getEffectiveTier" src/ --include="*.tsx" --include="*.ts"`

Expected matches (6 files total):
- `src/lib/utils/subscription.ts` (definition)
- `src/components/settings/StatusTab.tsx`
- `src/components/ui/SegmentBadge.tsx`
- `src/components/layout/header/GlobalHeader.tsx`
- `src/app/(dashboard)/subscription/overview/page.tsx` (new)
- `src/app/(dashboard)/subscription/plans/page.tsx` (new)

**Step 5: Update file-index.md**

In `docs/subscription-tier/file-index.md`, update the status of the two fixed files:

Change `overview/page.tsx` from **BUG** to **Fixed**
Change `plans/page.tsx` status from "Perlu review" to **Fixed**

**Step 6: Commit docs update**

```bash
git add docs/subscription-tier/file-index.md
git commit -m "docs: update subscription-tier file index with fixed pages"
```
