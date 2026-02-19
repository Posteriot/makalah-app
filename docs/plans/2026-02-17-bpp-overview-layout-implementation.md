# BPP Overview Layout Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign BPP subscription overview dari 2 card sparse + subpage terpisah menjadi 1 merged card + inline Pro pitch, dengan sidebar yang lebih ringkas.

**Architecture:** Layout-only refactor. Merge tier info + credit meter jadi 1 card dengan 2-column internal grid + `border-hairline` divider. Absorb Pro plan data dari `plans/page.tsx` ke `overview/page.tsx` sebagai inline card. Hapus sidebar item "Upgrade ke Pro" untuk BPP user.

**Tech Stack:** Next.js App Router, React, Tailwind CSS 4, Convex `useQuery`, Iconoir icons

**Design doc:** `docs/plans/2026-02-17-bpp-overview-layout-redesign.md`

---

### Task 1: Remove "Upgrade ke Pro" sidebar item for BPP

**Files:**
- Modify: `src/app/(dashboard)/subscription/layout.tsx:59-66`

**Step 1: Edit `getSidebarItems()` — remove BPP-only "Upgrade ke Pro" item**

In `layout.tsx`, delete the block at lines 59-66:

```tsx
// DELETE THIS BLOCK:
  // Upgrade ke Pro: BPP only (Gratis has generic "Upgrade")
  if (tier === "bpp") {
    items.push({
      href: "/subscription/plans",
      label: "Upgrade ke Pro",
      icon: Sparks,
    })
  }
```

After deletion, `Sparks` import is still used by other components? Check: `Sparks` is imported at line 15 but no longer used in this file after removal. Remove it from the import.

Remove `Sparks` from line 15 import:

```tsx
// BEFORE (line 7-16):
import {
  Dashboard,
  Clock,
  ArrowUpCircle,
  CreditCard,
  Sparks,
  NavArrowRight,
  SidebarExpand,
  SidebarCollapse,
} from "iconoir-react"

// AFTER:
import {
  Dashboard,
  Clock,
  ArrowUpCircle,
  CreditCard,
  NavArrowRight,
  SidebarExpand,
  SidebarCollapse,
} from "iconoir-react"
```

**Step 2: Verify sidebar items for each tier**

Expected sidebar items after change:
- **BPP:** Overview, Riwayat Pembayaran (2 items)
- **Gratis:** Overview, Upgrade (2 items — unchanged)
- **Pro:** Overview, Riwayat Pembayaran, Top Up (3 items — unchanged)
- **Unlimited:** Overview, Riwayat (2 items — unchanged)

**Step 3: Run lint**

Run: `npm run lint`
Expected: No errors related to unused imports

**Step 4: Commit**

```bash
git add src/app/(dashboard)/subscription/layout.tsx
git commit -m "refactor(subscription): remove Upgrade ke Pro sidebar item for BPP tier"
```

---

### Task 2: Refactor RegularOverviewView — merged card layout

**Files:**
- Modify: `src/app/(dashboard)/subscription/overview/page.tsx:71-184`

**Step 1: Replace `RegularOverviewView` with merged card layout**

Replace the entire `RegularOverviewView` function (lines 71-185) with:

```tsx
function RegularOverviewView({
  tier,
  tierConfig,
}: {
  tier: EffectiveTier
  tierConfig: { label: string; description: string; color: string; textColor: string }
}) {
  const meter = useCreditMeter()

  return (
    <>
      {/* Merged Tier + Saldo Card */}
      <div className="rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-border">
          {/* Left: Tier Info */}
          <div className="pb-4 md:pb-0 md:pr-4">
            <p className="text-signal text-[10px] text-muted-foreground">Tier Saat Ini</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-badge text-white",
                  tierConfig.color
                )}
              >
                {tierConfig.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{tierConfig.description}</p>

            {tier === "gratis" && (
              <Link
                href="/subscription/upgrade"
                className="focus-ring text-interface mt-4 inline-flex h-8 items-center gap-1.5 rounded-action border-main border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <ArrowUpCircle className="h-4 w-4" />
                Upgrade
              </Link>
            )}

            {(tier === "bpp" || tier === "pro") && (
              <Link
                href="/checkout/bpp?from=overview"
                className="focus-ring text-interface mt-4 inline-flex h-8 items-center gap-1.5 rounded-action border-main border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <CreditCard className="h-4 w-4" />
                Top Up Kredit
              </Link>
            )}
          </div>

          {/* Right: Saldo Kredit */}
          <div className="border-t border-border pt-4 md:border-t-0 md:pt-0 md:pl-4">
            <h2 className="text-signal text-[10px] text-muted-foreground mb-3">Saldo Kredit</h2>

            {/* Progress Bar */}
            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "absolute left-0 top-0 h-full rounded-full transition-all",
                  meter.level === "depleted" ? "bg-destructive"
                    : meter.level === "critical" ? "bg-destructive"
                    : meter.level === "warning" ? "bg-amber-500"
                    : "bg-primary"
                )}
                style={{ width: `${Math.min(meter.percentage, 100)}%` }}
              />
            </div>

            {/* Kredit text */}
            <div className="mt-2">
              <span className="font-mono text-xl font-bold">
                <span className={cn("text-foreground", (meter.level === "warning" || meter.level === "critical" || meter.level === "depleted") && "text-destructive")}>
                  {meter.used.toLocaleString("id-ID")}
                </span>
                <span className="text-muted-foreground"> / {meter.total.toLocaleString("id-ID")}</span>
                {" "}
                <span className="text-signal text-[10px] text-muted-foreground">kredit</span>
              </span>
            </div>

            {/* Pro: subtle reset note */}
            {tier === "pro" && (
              <p className="font-mono text-[10px] text-muted-foreground mt-1">Direset setiap bulan</p>
            )}

            {/* Blocked state */}
            {meter.level === "depleted" && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-destructive">
                  {tier === "gratis"
                    ? "Kredit habis. Upgrade untuk melanjutkan."
                    : "Kredit habis. Top up untuk melanjutkan."}
                </p>
                <Link
                  href={tier === "gratis" ? "/subscription/upgrade" : "/checkout/bpp?from=overview"}
                  className="focus-ring text-interface inline-flex h-8 items-center gap-1.5 rounded-action border-main border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  {tier === "gratis" ? "Upgrade" : "Top Up Kredit"}
                </Link>
              </div>
            )}

            {/* Warning state */}
            {(meter.level === "warning" || meter.level === "critical") && (
              <p className="text-xs text-amber-600 mt-2">
                Kredit hampir habis. {tier === "gratis" ? "Pertimbangkan upgrade." : "Pertimbangkan top up."}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
```

Key differences from current code:
- Single `rounded-shell` card wrapping both sections
- `grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-border` for 2-column with hairline divider
- Mobile: stacked vertically with `border-t` separator
- "Saldo Kredit" label uses `text-signal` (was "Penggunaan Kredit" with `text-interface`)
- Top Up link updated from `/subscription/topup?from=overview` to `/checkout/bpp?from=overview`

**Step 2: Run dev server and visually verify**

Run: `npm run dev`
Check: Navigate to `/subscription/overview` as BPP user. Verify:
- Single card with tier info on left, credit meter on right
- Hairline divider visible between columns
- Mobile: stacked vertically with border-t

**Step 3: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/(dashboard)/subscription/overview/page.tsx
git commit -m "refactor(subscription): merge tier + credit cards into single 2-column card for BPP"
```

---

### Task 3: Add Pro pitch card to RegularOverviewView (BPP only)

**Files:**
- Modify: `src/app/(dashboard)/subscription/overview/page.tsx`

**Step 1: Add Pro plan query and credit balance query**

At the top of `RegularOverviewView`, add queries after `useCreditMeter()`:

```tsx
function RegularOverviewView({
  tier,
  tierConfig,
}: {
  tier: EffectiveTier
  tierConfig: { label: string; description: string; color: string; textColor: string }
}) {
  const meter = useCreditMeter()

  // Pro plan data for BPP upgrade pitch
  const proPlan = useQuery(
    api.pricingPlans.getPlanBySlug,
    tier === "bpp" ? { slug: "pro" } : "skip"
  )
  const { user } = useCurrentUser()
  const creditBalance = useQuery(
    api.billing.credits.getCreditBalance,
    tier === "bpp" && user?._id ? { userId: user._id } : "skip"
  )

  // ... rest of return
```

Note: `useCurrentUser` is already imported at line 6. `useQuery` and `api` already imported at lines 4-5.

**Step 2: Add Pro pitch card after the merged card**

Inside the `<>...</>` fragment, after the merged card's closing `</div>`, add:

```tsx
      {/* Pro Upgrade Pitch — BPP only */}
      {tier === "bpp" && proPlan && (
        <div className="rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-interface text-sm font-medium text-foreground flex items-center gap-1.5">
                <Sparks className="h-4 w-4 text-primary" />
                Leluasa dengan Paket Pro
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {proPlan.teaserCreditNote || proPlan.features[0] || ""}
              </p>
              {(creditBalance?.remainingCredits ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Sisa {creditBalance!.remainingCredits.toLocaleString("id-ID")} kredit BPP Anda tetap tersimpan setelah upgrade.
                </p>
              )}
            </div>
            <p className="text-interface text-lg font-semibold tabular-nums text-foreground whitespace-nowrap ml-4">
              {proPlan.price}
              {proPlan.unit && (
                <span className="text-xs font-normal text-muted-foreground">/{proPlan.unit}</span>
              )}
            </p>
          </div>
          <div className="flex justify-end mt-3">
            <Link
              href="/checkout/pro?from=overview"
              className="focus-ring text-interface inline-flex h-8 items-center gap-1.5 rounded-action bg-slate-900 px-4 py-1.5 text-xs font-medium text-slate-100 transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Lanjut ke Checkout Pro
            </Link>
          </div>
        </div>
      )}
```

**Step 3: Add `Sparks` to icon imports**

Add `Sparks` to the import from `iconoir-react` at line 8-18:

```tsx
import {
  ArrowUpCircle,
  CreditCard,
  Sparks,
  GraphUp,
  ChatBubble,
  Page,
  Search,
  Refresh,
  RefreshDouble,
} from "iconoir-react"
```

`Sparks` is already imported at line 11. Verify it's there — if yes, skip this step.

**Step 4: Run dev server and visually verify**

Run: `npm run dev`
Check `/subscription/overview` as BPP user:
- Merged tier+credit card (from Task 2)
- Below it: Pro pitch card with plan name, price, description, checkout button
- Pro pitch card should NOT appear for Gratis or Pro users

**Step 5: Run lint**

Run: `npm run lint`

**Step 6: Commit**

```bash
git add src/app/(dashboard)/subscription/overview/page.tsx
git commit -m "feat(subscription): add inline Pro upgrade pitch card for BPP overview"
```

---

### Task 4: Redirect BPP users from /plans to /overview

**Files:**
- Modify: `src/app/(dashboard)/subscription/plans/page.tsx`

**Step 1: Add BPP redirect logic**

After the existing early returns (userLoading, !user), add redirect for BPP:

```tsx
  // line ~84, after `if (!user) { return ... }`

  const currentTier = getEffectiveTier(user.role, user.subscriptionStatus)

  // BPP users: Pro pitch is now in overview, redirect there
  if (currentTier === "bpp") {
    redirect("/subscription/overview")
  }
```

Note: `redirect` from `next/navigation` needs to be imported. Check current imports — line 7 doesn't have it. But wait, this is a client component (`"use client"`). Client components can't use `redirect` from `next/navigation` in the render body.

Instead, use `useRouter` + `useEffect`:

```tsx
import { useRouter } from "next/navigation"

// Inside PlansHubPage, after currentTier computation:
const router = useRouter()

useEffect(() => {
  if (currentTier === "bpp") {
    router.replace("/subscription/overview")
  }
}, [currentTier, router])

if (currentTier === "bpp") {
  return null // Prevent flash while redirecting
}
```

Add `useEffect` to the React import at line 1:

```tsx
import { useState, useCallback, useEffect } from "react"
```

Add `useRouter`:

```tsx
import { useRouter } from "next/navigation"
```

Place the redirect logic right after `currentTier` is computed (line 84), before `currentCredits`:

```tsx
  const currentTier = getEffectiveTier(user.role, user.subscriptionStatus)

  const router = useRouter()
  useEffect(() => {
    if (currentTier === "bpp") {
      router.replace("/subscription/overview")
    }
  }, [currentTier, router])

  if (currentTier === "bpp") {
    return null
  }

  const currentCredits = creditBalance?.remainingCredits ?? 0
  // ... rest unchanged
```

**Step 2: Run dev server and verify**

Run: `npm run dev`
Check: Navigate to `/subscription/plans` as BPP user → should redirect to `/subscription/overview`
Check: Navigate to `/subscription/plans` as Gratis user → should show BPP + Pro plan cards normally

**Step 3: Run lint**

Run: `npm run lint`

**Step 4: Commit**

```bash
git add src/app/(dashboard)/subscription/plans/page.tsx
git commit -m "refactor(subscription): redirect BPP users from /plans to /overview"
```

---

### Task 5: Visual QA and final verification

**Step 1: Check all BPP user flows**

Run: `npm run dev`

Verify as BPP user:
- [ ] `/subscription/overview` — merged card (tier left, credit right) + Pro pitch below
- [ ] Sidebar shows only 2 items: Overview, Riwayat Pembayaran
- [ ] "Top Up Kredit" button links to `/checkout/bpp?from=overview`
- [ ] "Lanjut ke Checkout Pro" links to `/checkout/pro?from=overview`
- [ ] `/subscription/plans` redirects to `/subscription/overview`
- [ ] `/subscription/history` — unchanged, works as before

Verify as Gratis user (no regressions):
- [ ] `/subscription/overview` — merged card shows Upgrade button (not Top Up)
- [ ] Sidebar shows: Overview, Upgrade
- [ ] `/subscription/plans` — shows BPP + Pro cards normally

Verify as Pro user (no regressions):
- [ ] `/subscription/overview` — merged card shows Top Up button, no Pro pitch card
- [ ] Sidebar shows: Overview, Riwayat Pembayaran, Top Up

Verify mobile responsive:
- [ ] Merged card stacks vertically (tier on top, credit below)
- [ ] Border-t separator visible on mobile (not divide-x)

**Step 2: Run full lint + build**

Run: `npm run lint && npm run build`
Expected: No errors

**Step 3: Commit (if any QA fixes needed)**

```bash
git add -A
git commit -m "fix(subscription): QA fixes for BPP overview layout redesign"
```
