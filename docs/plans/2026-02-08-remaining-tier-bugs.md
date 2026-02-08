# Fix Remaining Tier Bugs + DRY Cleanup — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the 3 remaining files with tier determination bugs and clean up dead code, completing the codebase-wide tier consistency effort.

**Architecture:** Same pattern as previous plans — import `getEffectiveTier()` from `src/lib/utils/subscription.ts`, replace raw `subscriptionStatus` reads. For `enforcement.ts` (server-side), add early admin return before tier determination. Delete unused `AccountStatusPage.tsx` (dead code). Refactor `ChatSidebar.tsx` for DRY consistency.

**Tech Stack:** TypeScript, React, Next.js, Convex

**Reference:** `docs/subscription-tier/` — data model, tier logic audit, file index

**Prerequisite:** `src/lib/utils/subscription.ts` with `getEffectiveTier()` already exists.

---

### Task 1: Fix QuotaWarningBanner — admin should never see quota warnings

**Files:**
- Modify: `src/components/chat/QuotaWarningBanner.tsx`

**Context:** This banner shows quota/credit warnings in the chat interface. Currently reads raw `subscriptionStatus` (line 49-50), causing admin/superadmin to be treated as `"gratis"` tier, which can trigger "Kuota habis. Upgrade ke Pro" warnings for admin. Admin (effective tier PRO) should never see quota warning banners.

**Step 1: Apply the fix**

Changes needed in `QuotaWarningBanner.tsx`:

1. Add import after existing imports (after `import { cn } from "@/lib/utils"`):
```typescript
import { getEffectiveTier } from "@/lib/utils/subscription"
```

2. Replace tier determination (lines 49-50):

Before:
```typescript
  const tier = user.subscriptionStatus || "free"
  const tierDisplay = tier === "free" ? "gratis" : tier
```

After:
```typescript
  const tier = getEffectiveTier(user.role, user.subscriptionStatus)
```

3. Replace all references to `tierDisplay` with `tier` (3 locations):

- Line 58: `if (tierDisplay === "gratis" || tierDisplay === "pro")` → `if (tier === "gratis" || tier === "pro")`
- Line 80: `} else if (tierDisplay === "bpp") {` → `} else if (tier === "bpp") {`
- Line 121: `tierDisplay === "bpp" ? CreditCard : Flash` → `tier === "bpp" ? CreditCard : Flash`

**Why this works:** `getEffectiveTier()` returns `"pro"` for admin/superadmin. The `if (tier === "gratis" || tier === "pro")` branch still handles Pro users, but Pro with `getQuotaStatus` returns `{ unlimited: true, percentageUsed: 0 }` from Convex backend (admin bypass at `quotas.ts:422-429`), so `percentUsed` will be 0 and no banner triggers. This means the existing logic handles PRO users correctly — no `bannerType` gets set, and the function returns `null` at line 105.

**Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/components/chat/QuotaWarningBanner.tsx
git commit -m "fix(chat): use getEffectiveTier in QuotaWarningBanner

Admin/superadmin no longer see quota warning or 'Upgrade' CTA.
Remove intermediate tierDisplay variable — getEffectiveTier already
normalizes 'free' to 'gratis'."
```

---

### Task 2: Fix enforcement.ts — correct tier determination in usage recording

**Files:**
- Modify: `src/lib/billing/enforcement.ts`

**Context:** Server-side billing middleware. `recordUsageAfterOperation()` determines tier at line 128 using raw `subscriptionStatus`, causing admin to be treated as `"gratis"` instead of `"pro"`. The function already fetches the user object (line 124) which has `role`, but doesn't use it for tier determination.

There's also an existing `isAdminUser()` helper at line 198-202 that checks role — but it's not used in `recordUsageAfterOperation()`. The cleanest fix: add early return for admin before tier determination, consistent with Convex backend pattern.

**Step 1: Apply the fix**

Changes needed in `enforcement.ts`:

1. Add import at top (after existing imports, line 9):
```typescript
import { getEffectiveTier } from "@/lib/utils/subscription"
```

Note: This file uses relative import `"../../../convex/_generated/api"` but also has `@/` alias available since it's in `src/lib/`. The `@/` alias works here.

2. Add admin early return and replace tier determination (lines 127-128):

Before:
```typescript
    // 3. Deduct based on tier
    const tier = user.subscriptionStatus === "free" ? "gratis" : user.subscriptionStatus
```

After:
```typescript
    // 3. Admin/superadmin: skip deduction (Convex backend also bypasses)
    if (user.role === "admin" || user.role === "superadmin") {
      return {
        eventId: recordResult.eventId,
        costIDR: recordResult.costIDR,
        deducted: false,
      }
    }

    // 4. Deduct based on tier
    const tier = getEffectiveTier(user.role, user.subscriptionStatus)
```

**Why early return instead of just replacing the tier line:** Even with `getEffectiveTier()` returning `"pro"`, admin would still call `deductQuota()` (which Convex bypasses). The early return avoids the unnecessary Convex call entirely, matching the Convex backend pattern where admin bypass happens before any deduction logic.

**Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/lib/billing/enforcement.ts
git commit -m "fix(billing): add admin bypass and use getEffectiveTier in enforcement

Admin/superadmin now skip deduction entirely in recordUsageAfterOperation.
Previously admin was treated as 'gratis' tier due to raw subscriptionStatus
read. Usage events still recorded, but no quota/credit deduction attempted."
```

---

### Task 3: DRY refactor ChatSidebar — use shared utility for upgrade CTA logic

**Files:**
- Modify: `src/components/chat/ChatSidebar.tsx`

**Context:** Chat sidebar shows an "Upgrade" button in footer for non-PRO users. Currently uses manual role check + raw `subscriptionStatus` at lines 84-88. Logic is correct (admin excluded), but can be simplified with `getEffectiveTier()` for consistency.

**Step 1: Apply the fix**

Changes needed in `ChatSidebar.tsx`:

1. Add import after existing imports (after `import type { PanelType } from "./shell/ActivityBar"`):
```typescript
import { getEffectiveTier } from "@/lib/utils/subscription"
```

2. Replace upgrade CTA logic (lines 83-88):

Before:
```typescript
  // Determine if user needs upgrade CTA (BPP or Gratis)
  const showUpgradeCTA =
    user &&
    user.role !== "admin" &&
    user.role !== "superadmin" &&
    (user.subscriptionStatus === "bpp" || user.subscriptionStatus === "free")
```

After:
```typescript
  // Determine if user needs upgrade CTA (non-PRO users only)
  const showUpgradeCTA =
    user && getEffectiveTier(user.role, user.subscriptionStatus) !== "pro"
```

**Why this is better:**
- Handles all edge cases (admin, `"gratis"` as future DB value, `"canceled"`, `undefined`)
- One-liner instead of 4 conditions
- Consistent pattern with the rest of the codebase

**Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/components/chat/ChatSidebar.tsx
git commit -m "refactor(chat): use getEffectiveTier for sidebar upgrade CTA

Replace manual role check + raw subscriptionStatus with shared utility.
Functionally identical but consistent with codebase pattern."
```

---

### Task 4: Delete dead code AccountStatusPage.tsx

**Files:**
- Delete: `src/components/user/AccountStatusPage.tsx`

**Context:** This component was created for Clerk's `<UserButton.UserProfilePage />` but is no longer imported anywhere in the codebase. The settings page (`/settings` with `StatusTab`) has replaced this functionality. The file also has a tier bug (raw `subscriptionStatus` at line 56), but instead of fixing dead code, delete it.

**Step 1: Verify it's truly unused**

Run: `grep -rn "AccountStatusPage" src/ --include="*.tsx" --include="*.ts" | grep -v "AccountStatusPage.tsx"`
Expected: No results (file is not imported anywhere)

**Step 2: Delete the file**

```bash
rm src/components/user/AccountStatusPage.tsx
```

**Step 3: Check if the directory is now empty**

Run: `ls src/components/user/`
If empty, delete the directory too: `rmdir src/components/user/`
If other files exist, leave directory.

**Step 4: Verify**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No type errors (file was unused, so removal shouldn't break anything)

**Step 5: Commit**

```bash
git add -A src/components/user/
git commit -m "chore: delete unused AccountStatusPage component

Replaced by /settings page with StatusTab. Component was not imported
anywhere. Also had tier bug (raw subscriptionStatus read) which is
now moot."
```

---

### Task 5: Build verification + update documentation

**Files:**
- Verify: full build + lint
- Modify: `docs/subscription-tier/file-index.md`
- Modify: `docs/subscription-tier/tier-determination-logic.md`

**Step 1: Full production build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds, no errors

**Step 2: Grep for remaining raw subscriptionStatus reads in frontend**

Run: `grep -rn "subscriptionStatus.*free\|subscriptionStatus.*||" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v ".d.ts"`

Expected remaining hits (all acceptable):
- `src/lib/utils/subscription.ts` — comment in shared utility (not a bug)
- `src/components/admin/AdminPanelContainer.tsx` — admin panel raw DB stats (intentional)
- `src/components/admin/UserList.tsx` — admin panel raw display (intentional)

No other frontend files should have raw `subscriptionStatus` reads.

**Step 3: Verify getEffectiveTier usage count**

Run: `grep -rn "getEffectiveTier" src/ --include="*.tsx" --include="*.ts"`

Expected matches (8 files total):
- `src/lib/utils/subscription.ts` (definition)
- `src/components/settings/StatusTab.tsx`
- `src/components/ui/SegmentBadge.tsx`
- `src/components/layout/header/GlobalHeader.tsx`
- `src/app/(dashboard)/subscription/overview/page.tsx`
- `src/app/(dashboard)/subscription/plans/page.tsx`
- `src/components/chat/QuotaWarningBanner.tsx` (new)
- `src/lib/billing/enforcement.ts` (new)
- `src/components/chat/ChatSidebar.tsx` (new)

That's 9 results (1 definition + 8 consumers).

**Step 4: Update file-index.md**

In `docs/subscription-tier/file-index.md`, update status of fixed files:

- `QuotaWarningBanner.tsx`: Change from **BUG** to **Fixed**
- `enforcement.ts`: Change from **BUG** to **Fixed**
- `ChatSidebar.tsx`: Change from **Aman (bisa DRY)** to **Fixed**
- `AccountStatusPage.tsx`: Change from **BUG** to **Deleted** (dead code)

Update summary table counts accordingly.

**Step 5: Update tier-determination-logic.md**

In `docs/subscription-tier/tier-determination-logic.md`:

- Move QuotaWarningBanner, enforcement.ts from "REMAINING BUGS" to "FIXED" table
- Move ChatSidebar from "SAFE BUT COULD USE DRY" to "FIXED" table
- Remove AccountStatusPage from "REMAINING BUGS" (deleted)
- Update "Rekomendasi Fix Berikutnya" — Prioritas 1 and 2 completed, only Prioritas 3 remains
- Update consumers list from 6 to 9 files

**Step 6: Commit docs update**

```bash
git add docs/subscription-tier/file-index.md docs/subscription-tier/tier-determination-logic.md
git commit -m "docs: update subscription-tier docs — all frontend bugs fixed

All 8 frontend locations now use getEffectiveTier(). Remaining items
are Convex backend (different runtime) and admin panel cosmetic display."
```
