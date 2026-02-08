# Fix Subscription Tier Consistency — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the subscription tier display in StatusTab so it correctly reflects the user's effective tier (matching the header badge), using a shared utility that eliminates duplicated logic.

**Architecture:** Extract the tier determination logic (already correct in GlobalHeader and SegmentBadge) into a single shared utility `getEffectiveTier()`. Then refactor StatusTab to use it, and refactor the two existing correct implementations to also use it (DRY). Scope is limited to the settings page + deduplication — other buggy locations (QuotaWarningBanner, enforcement.ts, subscription/overview) are out of scope for this plan.

**Tech Stack:** TypeScript, React, Next.js, Convex (useCurrentUser hook)

**Reference:** `docs/subscription-tier/` — data model, tier logic audit, file index

---

### Task 1: Create shared `getEffectiveTier` utility

**Files:**
- Create: `src/lib/utils/subscription.ts`

**Step 1: Create the utility file**

```typescript
// src/lib/utils/subscription.ts

export type EffectiveTier = "gratis" | "bpp" | "pro"

/**
 * Determine the effective subscription tier from user role and raw subscriptionStatus.
 *
 * Admin/superadmin are always treated as PRO (unlimited access) regardless of
 * their subscriptionStatus in the database (which defaults to "free").
 *
 * See docs/subscription-tier/tier-determination-logic.md for full context.
 */
export function getEffectiveTier(role?: string, subscriptionStatus?: string): EffectiveTier {
  // Admin and superadmin are always treated as PRO (unlimited access)
  if (role === "superadmin" || role === "admin") return "pro"

  // Regular users: check subscriptionStatus
  if (subscriptionStatus === "pro") return "pro"
  if (subscriptionStatus === "bpp") return "bpp"

  // Default for "free", "canceled", undefined, or any unknown value
  return "gratis"
}
```

**Step 2: Verify file created correctly**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to `subscription.ts`

**Step 3: Commit**

```bash
git add src/lib/utils/subscription.ts
git commit -m "feat(billing): add shared getEffectiveTier utility

Single source of truth for tier determination from role + subscriptionStatus.
Admin/superadmin always treated as PRO. See docs/subscription-tier/."
```

---

### Task 2: Refactor StatusTab to use `getEffectiveTier`

**Files:**
- Modify: `src/components/settings/StatusTab.tsx`

**Step 1: Apply the refactor**

Changes needed in `StatusTab.tsx`:

1. Add import at top:
```typescript
import { getEffectiveTier } from "@/lib/utils/subscription"
```

2. Remove the `"free"` key from `TierType` and `TIER_CONFIG` — after `getEffectiveTier()`, the value is always `"gratis" | "bpp" | "pro"`, never `"free"`:

```typescript
type TierType = "gratis" | "bpp" | "pro"

const TIER_CONFIG: Record<TierType, { label: string; className: string; showUpgrade: boolean }> = {
  gratis: { label: "GRATIS", className: "bg-emerald-600 text-white", showUpgrade: true },
  bpp: { label: "BPP", className: "bg-sky-600 text-white", showUpgrade: true },
  pro: { label: "PRO", className: "bg-amber-500 text-white", showUpgrade: false },
}
```

3. Replace the tier determination logic (line 80-81) inside the IIFE:

Before:
```typescript
const tierKey = (convexUser?.subscriptionStatus || "free").toLowerCase() as TierType
const tierConfig = TIER_CONFIG[tierKey] || TIER_CONFIG.free
```

After:
```typescript
const tierKey = getEffectiveTier(convexUser?.role, convexUser?.subscriptionStatus)
const tierConfig = TIER_CONFIG[tierKey]
```

No fallback needed — `getEffectiveTier` always returns a valid key.

**Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No type errors

Run: `npm run lint 2>&1 | grep -i error`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/components/settings/StatusTab.tsx
git commit -m "fix(settings): use getEffectiveTier in StatusTab for correct tier display

StatusTab now uses the shared getEffectiveTier() utility which checks
role before subscriptionStatus. Admin/superadmin correctly shows PRO
instead of GRATIS. Remove redundant 'free' key from TIER_CONFIG."
```

---

### Task 3: Refactor SegmentBadge to use shared utility

**Files:**
- Modify: `src/components/ui/SegmentBadge.tsx`

**Step 1: Apply the refactor**

Changes needed in `SegmentBadge.tsx`:

1. Add import:
```typescript
import { getEffectiveTier } from "@/lib/utils/subscription"
import type { EffectiveTier } from "@/lib/utils/subscription"
```

2. Remove the local `SubscriptionTier` type (line 10) — use `EffectiveTier` instead.

3. Remove the local `getSubscriptionTier` function (lines 47-56) entirely.

4. Update `TIER_CONFIG` type to use `EffectiveTier`:
```typescript
const TIER_CONFIG: Record<EffectiveTier, { label: string; className: string }> = {
```

5. Update the component function (line 71):

Before:
```typescript
const tier = getSubscriptionTier(role, subscriptionStatus)
```

After:
```typescript
const tier = getEffectiveTier(role, subscriptionStatus)
```

**Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/components/ui/SegmentBadge.tsx
git commit -m "refactor(ui): use shared getEffectiveTier in SegmentBadge

Replace local getSubscriptionTier() with shared utility.
Eliminates duplicate tier determination logic (DRY)."
```

---

### Task 4: Refactor GlobalHeader to use shared utility

**Files:**
- Modify: `src/components/layout/header/GlobalHeader.tsx`

**Step 1: Apply the refactor**

Changes needed in `GlobalHeader.tsx`:

1. Add import:
```typescript
import { getEffectiveTier } from "@/lib/utils/subscription"
```

2. Remove the local `getSegmentFromUser` function (lines 64-70) entirely.

3. Remove the local `SegmentType` type if it exists and is only used by the removed function.

4. Update usage (around line 169, search for where `getSegmentFromUser` is called):

Before:
```typescript
const segment = getSegmentFromUser(convexUser?.role, convexUser?.subscriptionStatus)
```

After:
```typescript
const segment = getEffectiveTier(convexUser?.role, convexUser?.subscriptionStatus)
```

5. If `SegmentType` is used elsewhere in the file (e.g., in JSX or other variables), import `EffectiveTier` and use that instead. If `SegmentType` had identical values (`"gratis" | "bpp" | "pro"`), it can be replaced directly.

**Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No type errors

Run: `npm run lint 2>&1 | grep -i error`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/components/layout/header/GlobalHeader.tsx
git commit -m "refactor(header): use shared getEffectiveTier in GlobalHeader

Replace local getSegmentFromUser() with shared utility.
Eliminates duplicate tier determination logic (DRY)."
```

---

### Task 5: Build verification

**Files:** None (verification only)

**Step 1: Full production build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds, no errors

**Step 2: Lint**

Run: `npm run lint 2>&1 | tail -10`
Expected: 0 errors

**Step 3: Grep for stale references**

Run: `grep -r "getSegmentFromUser\|getSubscriptionTier" src/ --include="*.ts" --include="*.tsx"`
Expected: No matches (both local functions should be fully removed)

Run: `grep -r "getEffectiveTier" src/ --include="*.ts" --include="*.tsx"`
Expected: Matches in `subscription.ts` (definition), `StatusTab.tsx`, `SegmentBadge.tsx`, `GlobalHeader.tsx`

**Step 4: Commit (if any fixes needed)**

Only commit if verification uncovered issues that needed fixing.
