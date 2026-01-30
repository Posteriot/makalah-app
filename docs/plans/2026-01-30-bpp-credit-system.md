# BPP Credit System Implementation Plan

**Goal:** Migrate BPP billing dari sistem top-up IDR ke sistem kredit (1 kredit = 1.000 tokens) dengan 3 paket (Paper/Extension S/Extension M).

**Architecture:**
- Layer 1 (Foundation): Update constants dan schema untuk sistem kredit
- Layer 2 (Backend): Rewrite Convex functions untuk handle kredit bukan IDR
- Layer 3 (API): Update payment routes untuk validasi paket
- Layer 4 (Enforcement): Token→credits conversion dengan soft-block
- Layer 5 (UI): Display kredit dan 3 paket di Plans Hub

**Tech Stack:** Convex, Next.js 16, TypeScript, Xendit Payment Gateway

**Source of Truth:** `docs/tokens/kalkulasi-gemini-tokens.md`, `docs/tokens/kalkulasi-fallback-gpt51.md`

**Spec Document:** `docs/pricing/bayar-per-paper-update.md`

---

## Phase 1: Foundation (Constants & Schema)

### Task 1.1: Update Billing Constants [DONE]

**Status:** Done
**Commit:** `2f9d83d`

**Files:**
- Modify: `convex/billing/constants.ts`

**Step 1: Backup current constants**

```bash
cp convex/billing/constants.ts convex/billing/constants.ts.bak
```

**Step 2: Replace credit conversion constants**

Replace lines 14-29 in `convex/billing/constants.ts`:

```typescript
// ════════════════════════════════════════════════════════════════
// Credit System (1 kredit = 1.000 tokens)
// ════════════════════════════════════════════════════════════════

// Credit conversion rate
export const TOKENS_PER_CREDIT = 1_000

// Paper soft cap
export const PAPER_CREDITS = 300
export const PAPER_TOKENS = 300_000  // 300 kredit × 1.000 tokens
export const PAPER_PRICE_IDR = 80_000

// Token pricing (based on Gemini 2.5 Flash - Jan 2026)
// Input: $0.30/1M = Rp 4.80/1K tokens
// Output: $2.50/1M = Rp 40.00/1K tokens
// Blended average (50:50): ~Rp 22.40/1K tokens = ~Rp 22.40/kredit
export const CREDIT_COST_IDR = 22.40  // Internal cost per credit (primary-only estimate)

// Credit packages
export const CREDIT_PACKAGES = [
  {
    type: "paper" as const,
    credits: 300,
    tokens: 300_000,
    priceIDR: 80_000,
    label: "Paket Paper",
    description: "1 paper lengkap (~15 halaman)",
    ratePerCredit: 267,  // Rp 80.000 / 300 kredit
  },
  {
    type: "extension_s" as const,
    credits: 50,
    tokens: 50_000,
    priceIDR: 25_000,
    label: "Extension S",
    description: "Revisi ringan",
    ratePerCredit: 500,
  },
  {
    type: "extension_m" as const,
    credits: 100,
    tokens: 100_000,
    priceIDR: 50_000,
    label: "Extension M",
    description: "Revisi berat",
    ratePerCredit: 500,
  },
] as const

export type CreditPackageType = typeof CREDIT_PACKAGES[number]["type"]
```

**Step 3: Add helper functions**

Add after the CREDIT_PACKAGES definition:

```typescript
// ════════════════════════════════════════════════════════════════
// Credit Helper Functions
// ════════════════════════════════════════════════════════════════

/**
 * Convert tokens to credits (ceiling)
 */
export function tokensToCredits(tokens: number): number {
  return Math.ceil(tokens / TOKENS_PER_CREDIT)
}

/**
 * Convert credits to tokens
 */
export function creditsToTokens(credits: number): number {
  return credits * TOKENS_PER_CREDIT
}

/**
 * Get package by type
 */
export function getPackageByType(type: CreditPackageType) {
  return CREDIT_PACKAGES.find(p => p.type === type)
}

/**
 * Validate package type
 */
export function isValidPackageType(type: string): type is CreditPackageType {
  return CREDIT_PACKAGES.some(p => p.type === type)
}
```

**Step 4: Keep legacy constants for backward compatibility**

Add comment block for deprecated constants (keep them temporarily):

```typescript
// ════════════════════════════════════════════════════════════════
// DEPRECATED - Legacy constants (remove after migration complete)
// ════════════════════════════════════════════════════════════════

/** @deprecated Use TOKENS_PER_CREDIT instead */
export const TOKENS_PER_IDR = 10

/** @deprecated Use PAPER_TOKENS instead */
export const BPP_PAPER_TOKENS_ESTIMATE = 800_000

/** @deprecated Use PAPER_PRICE_IDR instead */
export const BPP_PAPER_PRICE_IDR = 80_000

/** @deprecated Use CREDIT_PACKAGES instead */
export const TOP_UP_PACKAGES = [
  { amount: 25_000, tokens: 250_000, label: "Rp 25.000" },
  { amount: 50_000, tokens: 500_000, label: "Rp 50.000", popular: true },
  { amount: 100_000, tokens: 1_000_000, label: "Rp 100.000" },
] as const
```

**PENTING: JANGAN HAPUS konstanta berikut - masih dipakai oleh `usage.ts`:**

```typescript
// Token pricing untuk cost tracking (dipakai oleh usage.ts)
// HARUS TETAP ADA - jangan hapus!
//
// Estimasi PRIMARY (Gemini) saja:
// Blended average (50:50) = Rp 22,40/1K tokens
// Catatan: fallback (GPT-5.1) lebih mahal, tidak dihitung di sini
export const TOKEN_PRICE_PER_1K_IDR = 22.40

export function calculateCostIDR(totalTokens: number): number {
  return Math.ceil((totalTokens / 1000) * TOKEN_PRICE_PER_1K_IDR)
}
```

> **Catatan:** `calculateCostIDR()` dipakai oleh `convex/billing/usage.ts:recordUsage()` untuk menghitung `costIDR` di `usageEvents` table. Jika dihapus, cost tracking akan rusak.

**Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit -p convex/tsconfig.json
```

Expected: No errors

**Step 6: Commit**

```bash
git add convex/billing/constants.ts
git commit -m "feat(billing): add credit system constants

- Add TOKENS_PER_CREDIT = 1000
- Add CREDIT_PACKAGES (paper/extension_s/extension_m)
- Add helper functions (tokensToCredits, creditsToTokens)
- Keep legacy constants deprecated for backward compat"
```

---

### Task 1.2: Update Schema - creditBalances Table [DONE]

**Status:** Done
**Commit:** `4c97ca9`

**Files:**
- Modify: `convex/schema.ts:620-639`

**Step 1: Update creditBalances table definition**

Replace the `creditBalances` table (lines 620-639) with:

```typescript
// Credit balance (untuk BPP/Bayar Per Paper tier)
creditBalances: defineTable({
  userId: v.id("users"),

  // Credit tracking (dalam kredit, bukan IDR)
  totalCredits: v.number(),      // Total kredit yang dibeli
  usedCredits: v.number(),       // Kredit yang sudah terpakai
  remainingCredits: v.number(),  // Sisa kredit (computed: total - used)

  // Lifetime stats
  totalPurchasedCredits: v.number(),  // Total kredit dibeli sepanjang waktu
  totalSpentCredits: v.number(),      // Total kredit dipakai sepanjang waktu

  // Last purchase reference
  lastPurchaseAt: v.optional(v.number()),
  lastPurchaseType: v.optional(v.string()),  // "paper" | "extension_s" | "extension_m"
  lastPurchaseCredits: v.optional(v.number()),

  // Legacy fields (deprecated - keep for migration)
  balanceIDR: v.optional(v.number()),
  balanceTokens: v.optional(v.number()),
  totalTopUpIDR: v.optional(v.number()),
  totalSpentIDR: v.optional(v.number()),
  lastTopUpAt: v.optional(v.number()),
  lastTopUpAmount: v.optional(v.number()),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"]),
```

**Step 2: Verify schema compiles**

```bash
npx tsc --noEmit -p convex/tsconfig.json
```

Expected: No errors

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): update creditBalances for credit system

- Change from IDR-based to credit-based tracking
- Add totalCredits, usedCredits, remainingCredits
- Add lastPurchaseType for package tracking
- Keep legacy fields optional for migration"
```

---

### Task 1.3: Update Schema - paperSessions Soft-Block Fields [DONE]

**Status:** Done
**Commit:** `031aa52`

**Files:**
- Modify: `convex/schema.ts:293-450` (paperSessions table)

**Step 1: Add credit tracking fields to paperSessions**

Find the `paperSessions` table definition and add these fields after `estimatedTokenUsage`:

```typescript
// ════════════════════════════════════════════════════════════════
// Credit Soft Cap Tracking (per paper session)
// ════════════════════════════════════════════════════════════════
creditAllotted: v.optional(v.number()),    // Kredit yang dialokasikan (default: 300)
creditUsed: v.optional(v.number()),        // Kredit yang sudah terpakai di session ini
creditRemaining: v.optional(v.number()),   // Sisa kredit session (computed)
isSoftBlocked: v.optional(v.boolean()),    // True jika kredit habis
softBlockedAt: v.optional(v.number()),     // Timestamp saat soft-blocked
```

**Step 2: Verify schema compiles**

```bash
npx tsc --noEmit -p convex/tsconfig.json
```

Expected: No errors

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add credit soft-block fields to paperSessions

- Add creditAllotted, creditUsed, creditRemaining
- Add isSoftBlocked and softBlockedAt for soft-block UI"
```

---

### Task 1.4: Update Schema - payments Table [DONE]

**Status:** Done
**Commit:** `365baf8`

**Files:**
- Modify: `convex/schema.ts:641-699` (payments table)

**Step 1: Add package tracking fields to payments**

Find the `payments` table and add after `paymentType`:

```typescript
// Credit package info
packageType: v.optional(v.union(
  v.literal("paper"),
  v.literal("extension_s"),
  v.literal("extension_m")
)),
credits: v.optional(v.number()),  // 300, 50, atau 100
```

**Step 2: Verify schema compiles**

```bash
npx tsc --noEmit -p convex/tsconfig.json
```

Expected: No errors

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add packageType and credits to payments

- Track which credit package was purchased
- Store credits amount for webhook processing"
```

---

### Task 1.5: Update Schema - pricingPlans Table [DONE]

**Status:** Done
**Commit:** `73bf3ba`

**Files:**
- Modify: `convex/schema.ts:476-503` (pricingPlans table)

**Step 1: Add creditPackages field**

Find the `pricingPlans` table and add after `topupOptions`:

```typescript
// Credit packages (new system - replaces topupOptions)
creditPackages: v.optional(v.array(v.object({
  type: v.union(v.literal("paper"), v.literal("extension_s"), v.literal("extension_m")),
  credits: v.number(),
  tokens: v.number(),
  priceIDR: v.number(),
  label: v.string(),
  description: v.optional(v.string()),
  ratePerCredit: v.optional(v.number()),
  popular: v.optional(v.boolean()),
}))),
```

**Step 2: Verify schema compiles**

```bash
npx tsc --noEmit -p convex/tsconfig.json
```

Expected: No errors

**Step 3: Deploy schema changes**

```bash
npx convex deploy --yes
```

Expected: Schema deployed successfully

**Step 4: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add creditPackages to pricingPlans

- New credit-based package options
- Replaces topupOptions (kept for backward compat)"
```

---

## Phase 2: Backend Logic (Convex Functions)

### Task 2.1: Rewrite credits.ts

**Files:**
- Modify: `convex/billing/credits.ts` (full rewrite)

**Step 1: Rewrite the entire file**

Replace entire content of `convex/billing/credits.ts`:

```typescript
/**
 * Credit Balance Management
 * For BPP (Bayar Per Paper) tier users
 *
 * Credit System: 1 kredit = 1.000 tokens
 */

import { v } from "convex/values"
import { mutation, query } from "../_generated/server"
import { TOKENS_PER_CREDIT, tokensToCredits } from "./constants"
import { requireAuthUserId } from "../auth"

function isInternalKeyValid(internalKey?: string) {
  const expected = process.env.CONVEX_INTERNAL_KEY
  return Boolean(expected && internalKey === expected)
}

/**
 * Get user's credit balance
 */
export const getCreditBalance = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (!balance) {
      return {
        totalCredits: 0,
        usedCredits: 0,
        remainingCredits: 0,
        totalPurchasedCredits: 0,
        totalSpentCredits: 0,
        lastPurchaseAt: null,
        lastPurchaseType: null,
        lastPurchaseCredits: null,
      }
    }

    return {
      totalCredits: balance.totalCredits,
      usedCredits: balance.usedCredits,
      remainingCredits: balance.remainingCredits,
      totalPurchasedCredits: balance.totalPurchasedCredits,
      totalSpentCredits: balance.totalSpentCredits,
      lastPurchaseAt: balance.lastPurchaseAt,
      lastPurchaseType: balance.lastPurchaseType,
      lastPurchaseCredits: balance.lastPurchaseCredits,
    }
  },
})

/**
 * Initialize credit balance for a new BPP user
 */
export const initializeCreditBalance = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)

    const existing = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (existing) {
      return existing._id
    }

    const now = Date.now()
    const balanceId = await ctx.db.insert("creditBalances", {
      userId: args.userId,
      totalCredits: 0,
      usedCredits: 0,
      remainingCredits: 0,
      totalPurchasedCredits: 0,
      totalSpentCredits: 0,
      createdAt: now,
      updatedAt: now,
    })

    return balanceId
  },
})

/**
 * Add credits after successful payment
 * Called from payment webhook handler
 */
export const addCredits = mutation({
  args: {
    userId: v.id("users"),
    credits: v.number(),
    packageType: v.string(),
    paymentId: v.optional(v.id("payments")),
    internalKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!isInternalKeyValid(args.internalKey)) {
      await requireAuthUserId(ctx, args.userId)
    }

    const now = Date.now()

    // Get or create balance
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (!balance) {
      // Create new balance
      const balanceId = await ctx.db.insert("creditBalances", {
        userId: args.userId,
        totalCredits: args.credits,
        usedCredits: 0,
        remainingCredits: args.credits,
        totalPurchasedCredits: args.credits,
        totalSpentCredits: 0,
        lastPurchaseAt: now,
        lastPurchaseType: args.packageType,
        lastPurchaseCredits: args.credits,
        createdAt: now,
        updatedAt: now,
      })

      // Upgrade user to BPP tier if on free
      const user = await ctx.db.get(args.userId)
      if (user && user.subscriptionStatus === "free") {
        await ctx.db.patch(args.userId, {
          subscriptionStatus: "bpp",
          updatedAt: now,
        })
      }

      return {
        balanceId,
        newTotalCredits: args.credits,
        newRemainingCredits: args.credits,
      }
    }

    // Update existing balance
    const newTotalCredits = balance.totalCredits + args.credits
    const newRemainingCredits = balance.remainingCredits + args.credits

    await ctx.db.patch(balance._id, {
      totalCredits: newTotalCredits,
      remainingCredits: newRemainingCredits,
      totalPurchasedCredits: balance.totalPurchasedCredits + args.credits,
      lastPurchaseAt: now,
      lastPurchaseType: args.packageType,
      lastPurchaseCredits: args.credits,
      updatedAt: now,
    })

    // Upgrade user to BPP tier if on free
    const user = await ctx.db.get(args.userId)
    if (user && user.subscriptionStatus === "free") {
      await ctx.db.patch(args.userId, {
        subscriptionStatus: "bpp",
        updatedAt: now,
      })
    }

    return {
      balanceId: balance._id,
      newTotalCredits,
      newRemainingCredits,
      previousRemainingCredits: balance.remainingCredits,
    }
  },
})

/**
 * Deduct credits after token usage
 * Called after successful AI response for BPP users
 */
export const deductCredits = mutation({
  args: {
    userId: v.id("users"),
    tokensUsed: v.number(),
    sessionId: v.optional(v.id("paperSessions")),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)

    const creditsToDeduct = tokensToCredits(args.tokensUsed)

    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (!balance) {
      throw new Error("Credit balance not found")
    }

    if (balance.remainingCredits < creditsToDeduct) {
      throw new Error(
        `Insufficient credits. Required: ${creditsToDeduct}, Available: ${balance.remainingCredits}`
      )
    }

    const newUsedCredits = balance.usedCredits + creditsToDeduct
    const newRemainingCredits = balance.remainingCredits - creditsToDeduct

    await ctx.db.patch(balance._id, {
      usedCredits: newUsedCredits,
      remainingCredits: newRemainingCredits,
      totalSpentCredits: balance.totalSpentCredits + creditsToDeduct,
      updatedAt: Date.now(),
    })

    // Update paper session credit tracking if provided
    if (args.sessionId) {
      const session = await ctx.db.get(args.sessionId)
      if (session) {
        const sessionCreditUsed = (session.creditUsed ?? 0) + creditsToDeduct
        const sessionCreditRemaining = (session.creditAllotted ?? 300) - sessionCreditUsed
        const isSoftBlocked = sessionCreditRemaining <= 0

        await ctx.db.patch(args.sessionId, {
          creditUsed: sessionCreditUsed,
          creditRemaining: sessionCreditRemaining,
          isSoftBlocked,
          ...(isSoftBlocked ? { softBlockedAt: Date.now() } : {}),
        })
      }
    }

    return {
      creditsDeducted: creditsToDeduct,
      tokensUsed: args.tokensUsed,
      remainingCredits: newRemainingCredits,
    }
  },
})

/**
 * Check if user has sufficient credits
 * Pre-flight check before AI operation
 */
export const checkCredits = query({
  args: {
    userId: v.id("users"),
    estimatedTokens: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)

    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    const estimatedCredits = tokensToCredits(args.estimatedTokens)
    const currentCredits = balance?.remainingCredits ?? 0

    if (currentCredits < estimatedCredits) {
      return {
        sufficient: false,
        currentCredits,
        estimatedCredits,
        shortfallCredits: estimatedCredits - currentCredits,
        message: `Kredit tidak cukup. Estimasi: ${estimatedCredits} kredit, saldo: ${currentCredits} kredit`,
      }
    }

    return {
      sufficient: true,
      currentCredits,
      estimatedCredits,
      remainingAfter: currentCredits - estimatedCredits,
    }
  },
})

/**
 * Get credit transaction history
 */
export const getCreditHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    const limitCount = args.limit ?? 30

    // Get purchases (payments with packageType)
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", args.userId).eq("paymentType", "credit_topup")
      )
      .order("desc")
      .take(limitCount)

    // Get usage events
    const usageEvents = await ctx.db
      .query("usageEvents")
      .withIndex("by_user_time", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limitCount)

    // Combine and sort
    const transactions = [
      ...payments
        .filter((p) => p.status === "SUCCEEDED")
        .map((p) => ({
          id: p._id,
          type: "purchase" as const,
          description: `Beli ${p.packageType ?? "Paket"}`,
          credits: p.credits ?? 0,
          createdAt: p.paidAt ?? p.createdAt,
        })),
      ...usageEvents.map((e) => ({
        id: e._id,
        type: "usage" as const,
        description: `${e.operationType === "chat_message" ? "Chat" : e.operationType === "paper_generation" ? "Paper" : e.operationType === "web_search" ? "Web Search" : "Refrasa"}`,
        credits: -tokensToCredits(e.totalTokens),
        createdAt: e.createdAt,
      })),
    ].sort((a, b) => b.createdAt - a.createdAt)

    return transactions.slice(0, limitCount)
  },
})
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit -p convex/tsconfig.json
```

Expected: No errors

**Step 3: Deploy**

```bash
npx convex deploy --yes
```

Expected: Deployed successfully

**Step 4: Commit**

```bash
git add convex/billing/credits.ts
git commit -m "feat(billing): rewrite credits.ts for credit system

- Change from IDR-based to credit-based tracking
- addCredits now takes credits and packageType
- deductCredits converts tokens to credits
- Update paper session soft-block tracking
- getCreditHistory shows credit transactions"
```

---

### Task 2.2: Update payments.ts - Add Package Fields

**Files:**
- Modify: `convex/billing/payments.ts`

**Step 1: Update createPayment args**

Find `createPayment` mutation and add to args:

```typescript
packageType: v.optional(v.union(
  v.literal("paper"),
  v.literal("extension_s"),
  v.literal("extension_m")
)),
credits: v.optional(v.number()),
```

**Step 2: Update createPayment handler**

Add to the insert object:

```typescript
packageType: args.packageType,
credits: args.credits,
```

**Step 3: Update updatePaymentStatus return**

Add to return object:

```typescript
packageType: payment.packageType,
credits: payment.credits,
```

**Step 4: Verify and deploy**

```bash
npx tsc --noEmit -p convex/tsconfig.json && npx convex deploy --yes
```

**Step 5: Commit**

```bash
git add convex/billing/payments.ts
git commit -m "feat(billing): add packageType and credits to payments

- Track credit package in payment creation
- Return package info in status update"
```

---

### Task 2.3: Update pricingPlans.ts - Add getCreditPackagesForPlan

**Files:**
- Modify: `convex/pricingPlans.ts`

**Step 1: Import CREDIT_PACKAGES**

Add at top:

```typescript
import { CREDIT_PACKAGES } from "./billing/constants"
```

**Step 2: Add new query**

Add after `getTopupOptionsForPlan`:

```typescript
/**
 * Get credit packages for a specific plan (BPP)
 * Returns creditPackages from database with fallback to hardcoded constants
 */
export const getCreditPackagesForPlan = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("pricingPlans")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()

    if (!plan) {
      console.warn(`[pricingPlans] Plan not found: ${args.slug}, using fallback`)
      return {
        planExists: false,
        creditPackages: CREDIT_PACKAGES.map(pkg => ({
          type: pkg.type,
          credits: pkg.credits,
          tokens: pkg.tokens,
          priceIDR: pkg.priceIDR,
          label: pkg.label,
          description: pkg.description,
          ratePerCredit: pkg.ratePerCredit,
          popular: pkg.type === "paper",
        })),
      }
    }

    if (plan.creditPackages && plan.creditPackages.length > 0) {
      return {
        planExists: true,
        creditPackages: plan.creditPackages,
      }
    }

    // Fallback to constants
    return {
      planExists: true,
      creditPackages: CREDIT_PACKAGES.map(pkg => ({
        type: pkg.type,
        credits: pkg.credits,
        tokens: pkg.tokens,
        priceIDR: pkg.priceIDR,
        label: pkg.label,
        description: pkg.description,
        ratePerCredit: pkg.ratePerCredit,
        popular: pkg.type === "paper",
      })),
    }
  },
})
```

**Step 3: Verify and deploy**

```bash
npx tsc --noEmit -p convex/tsconfig.json && npx convex deploy --yes
```

**Step 4: Commit**

```bash
git add convex/pricingPlans.ts
git commit -m "feat(pricingPlans): add getCreditPackagesForPlan query

- Return credit packages for BPP plan
- Fallback to CREDIT_PACKAGES constants"
```

---

### Task 2.4: Create Migration - activateCreditPackages

**Files:**
- Modify: `convex/migrations/seedPricingPlans.ts`

**Step 1: Import CREDIT_PACKAGES**

Add to imports:

```typescript
import { CREDIT_PACKAGES } from "../billing/constants"
```

**Step 2: Add new migration function**

Add at end of file:

```typescript
/**
 * Migration to add credit packages to BPP plan
 * Run via: npx convex run "migrations/seedPricingPlans:activateCreditPackages"
 */
export const activateCreditPackages = internalMutation({
  handler: async ({ db }) => {
    const now = Date.now()
    const updates: string[] = []

    // Convert CREDIT_PACKAGES to creditPackages format
    const creditPackages = CREDIT_PACKAGES.map((pkg) => ({
      type: pkg.type,
      credits: pkg.credits,
      tokens: pkg.tokens,
      priceIDR: pkg.priceIDR,
      label: pkg.label,
      description: pkg.description,
      ratePerCredit: pkg.ratePerCredit,
      popular: pkg.type === "paper",
    }))

    // Update BPP plan
    const bppPlan = await db
      .query("pricingPlans")
      .filter((q) => q.eq(q.field("slug"), "bpp"))
      .first()

    if (bppPlan) {
      await db.patch(bppPlan._id, {
        creditPackages,
        ctaText: "Beli Paket Paper",
        updatedAt: now,
      })
      updates.push("BPP: creditPackages added")
    }

    return {
      success: true,
      updates,
      creditPackages,
      message: `Activated credit packages. Updated ${updates.length} plans.`,
    }
  },
})
```

**Step 3: Deploy and run migration**

```bash
npx convex deploy --yes
npx convex run "migrations/seedPricingPlans:activateCreditPackages"
```

**Step 4: Verify migration**

```bash
npm run convex -- run "pricingPlans:getCreditPackagesForPlan" --args '{"slug": "bpp"}'
```

Expected: Should return creditPackages with 3 items (paper, extension_s, extension_m)

**Step 5: Commit**

```bash
git add convex/migrations/seedPricingPlans.ts
git commit -m "feat(migrations): add activateCreditPackages migration

- Add creditPackages to BPP plan
- Update CTA text to 'Beli Paket Paper'"
```

---

### Task 2.5: Update quotas.ts - Preflight Credit Check

**Files:**
- Modify: `convex/billing/quotas.ts`

**Latar Belakang:**

Saat ini `checkQuota` query untuk BPP tier mengecek `balanceIDR` (IDR-based). Harus diganti ke credit-based agar konsisten dengan sistem kredit baru.

**Step 1: Import tokensToCredits**

Add to imports at top of file:

```typescript
import { tokensToCredits } from "./constants"
```

**Step 2: Update checkQuota BPP section**

Find the BPP credit check section (around lines 311-333) and replace:

```typescript
// KODE LAMA (hapus ini)
if (limits.creditBased) {
  const balance = await ctx.db
    .query("creditBalances")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .first()

  const estimatedCost = Math.ceil((args.estimatedTokens / 1000) * 3) // ~Rp 3/1K tokens
  const currentBalance = balance?.balanceIDR ?? 0

  if (currentBalance < estimatedCost) {
    return {
      allowed: false,
      reason: "insufficient_credit",
      message: `Saldo tidak cukup. Estimasi: Rp ${estimatedCost.toLocaleString("id-ID")}, saldo: Rp ${currentBalance.toLocaleString("id-ID")}`,
      action: "topup",
      currentBalance,
      requiredAmount: estimatedCost,
    }
  }

  return { allowed: true, tier: "bpp", currentBalance }
}
```

Replace with:

```typescript
// KODE BARU (credit-based)
if (limits.creditBased) {
  const balance = await ctx.db
    .query("creditBalances")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .first()

  const estimatedCredits = tokensToCredits(args.estimatedTokens)
  const currentCredits = balance?.remainingCredits ?? 0

  if (currentCredits < estimatedCredits) {
    return {
      allowed: false,
      reason: "insufficient_credit",
      message: `Kredit tidak cukup. Estimasi: ${estimatedCredits} kredit, saldo: ${currentCredits} kredit`,
      action: "topup",
      currentCredits,
      estimatedCredits,
    }
  }

  return { allowed: true, tier: "bpp", currentCredits }
}
```

**Step 3: Update getQuotaStatus BPP section**

Find the BPP section in `getQuotaStatus` (around lines 434-449) and update:

```typescript
// BPP: Return credit balance status
if (limits.creditBased) {
  const balance = await ctx.db
    .query("creditBalances")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .first()

  const currentCredits = balance?.remainingCredits ?? 0
  const totalCredits = balance?.totalCredits ?? 0

  return {
    tier: "bpp",
    creditBased: true,
    currentCredits,
    totalCredits,
    usedCredits: balance?.usedCredits ?? 0,
    warningLevel: currentCredits < 30 ? "critical" : currentCredits < 100 ? "warning" : "none",
  }
}
```

**Step 4: Verify and deploy**

```bash
npx tsc --noEmit -p convex/tsconfig.json && npx convex deploy --yes
```

**Step 5: Commit**

```bash
git add convex/billing/quotas.ts
git commit -m "feat(quotas): update checkQuota from IDR to credit-based

- Use tokensToCredits() for estimation
- Check remainingCredits instead of balanceIDR
- Update getQuotaStatus for credit display"
```

---

## Phase 3: API Routes

### Task 3.1: Update topup/route.ts

**Files:**
- Modify: `src/app/api/payments/topup/route.ts`

**Step 1: Import package constants**

Replace imports at top:

```typescript
import { CREDIT_PACKAGES, isValidPackageType, getPackageByType } from "@convex/billing/constants"
```

**Step 2: Update request interface**

Replace `TopUpRequest` interface:

```typescript
interface TopUpRequest {
  packageType: "paper" | "extension_s" | "extension_m"
  paymentMethod: "qris" | "va" | "ewallet"
  vaChannel?: VAChannel
  ewalletChannel?: EWalletChannel
  mobileNumber?: string
}
```

**Step 3: Replace validation logic**

Replace the validation section (around lines 60-66):

```typescript
// 4. Validate package type
if (!isValidPackageType(body.packageType)) {
  return NextResponse.json(
    { error: `Paket tidak valid. Pilih: paper, extension_s, atau extension_m` },
    { status: 400 }
  )
}

const pkg = getPackageByType(body.packageType)
if (!pkg) {
  return NextResponse.json(
    { error: "Paket tidak ditemukan" },
    { status: 400 }
  )
}

const { credits, priceIDR: amount, label: packageLabel } = pkg
```

**Step 4: Update payment creation call**

Update the `createPayment` call to include package info:

```typescript
const paymentId = await fetchMutation(api.billing.payments.createPayment, {
  userId: convexUser._id as Id<"users">,
  xenditPaymentRequestId: xenditResponse.payment_request_id,
  xenditReferenceId: referenceId,
  amount,
  paymentMethod: paymentMethodType,
  paymentChannel,
  paymentType: "credit_topup",
  packageType: body.packageType,
  credits,
  description: `${packageLabel} (${credits} kredit)`,
  idempotencyKey,
  expiredAt: expiresAt,
}, convexOptions)
```

**Step 5: Update response**

Add to responseData:

```typescript
packageType: body.packageType,
credits,
packageLabel,
```

**Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 7: Commit**

```bash
git add src/app/api/payments/topup/route.ts
git commit -m "feat(api): update topup route for credit packages

- Validate packageType instead of amount
- Pass credits and packageType to payment creation
- Return package info in response"
```

---

### Task 3.2: Update Xendit Webhook Handler

**Files:**
- Modify: `src/app/api/webhooks/xendit/route.ts`

**Step 1: Update handlePaymentSuccess**

Replace the `credit_topup` case (around lines 169-186):

```typescript
case "credit_topup": {
  // Get credits from payment record
  const creditsToAdd = payment.credits ?? 0
  const packageType = payment.packageType ?? "paper"

  if (creditsToAdd === 0) {
    console.warn(`[Xendit] Payment has no credits: ${data.id}`)
    break
  }

  // Add credits to user balance
  const creditResult = await fetchMutation(api.billing.credits.addCredits, {
    userId: payment.userId as Id<"users">,
    credits: creditsToAdd,
    packageType,
    paymentId: payment._id as Id<"payments">,
    internalKey,
  })

  newCredits = creditsToAdd
  newTotalCredits = creditResult.newTotalCredits

  console.log(`[Xendit] Credits added:`, {
    userId: payment.userId,
    credits: creditsToAdd,
    packageType,
    newTotalCredits: creditResult.newTotalCredits,
  })
  break
}
```

**Step 2: Update email sending**

Update the email section to use credits:

```typescript
if (user?.email) {
  const emailResult = await sendPaymentSuccessEmail({
    to: user.email,
    userName: user.firstName || undefined,
    amount: data.amount,
    credits: newCredits,
    newTotalCredits: newTotalCredits,
    transactionId: data.id,
    paidAt: data.paid_at ? new Date(data.paid_at).getTime() : Date.now(),
  })
  // ...
}
```

**Step 3: Declare variables at top of handlePaymentSuccess**

Add after function signature:

```typescript
let newCredits: number | undefined
let newTotalCredits: number | undefined
```

**Step 4: Commit**

```bash
git add src/app/api/webhooks/xendit/route.ts
git commit -m "feat(webhook): update xendit handler for credit system

- Read credits from payment record
- Pass credits to addCredits mutation
- Include credits in email notification"
```

---

## Phase 4: Enforcement

### Task 4.1: Update enforcement.ts

**Files:**
- Modify: `src/lib/billing/enforcement.ts`

**Step 1: Import tokensToCredits**

Add to imports:

```typescript
import { tokensToCredits } from "@convex/billing/constants"
```

**Step 2: Update recordUsageAfterOperation**

Update the BPP deduction section:

```typescript
if (tier === "bpp") {
  // BPP: Deduct from credit balance
  try {
    const deductResult = await fetchMutation(api.billing.credits.deductCredits, {
      userId: params.userId,
      tokensUsed: params.totalTokens,
      sessionId: params.sessionId,  // For soft-block tracking
    }, convexOptions)

    console.log(`[Billing] Credits deducted:`, {
      userId: params.userId,
      tokensUsed: params.totalTokens,
      creditsDeducted: deductResult.creditsDeducted,
      remainingCredits: deductResult.remainingCredits,
    })
  } catch (error) {
    // Check for insufficient credits (soft-block)
    if (error instanceof Error && error.message.includes("Insufficient credits")) {
      console.warn("[Billing] Soft-block triggered:", error.message)
      // Don't throw - let the response complete, UI will show soft-block
    } else {
      console.warn("[Billing] Credit deduction failed:", error)
    }
  }
}
```

**Step 3: Implement soft-block response helper (baru)**

Tambahkan helper baru di `enforcement.ts` agar tidak ada referensi fungsi yang belum ada:

```typescript
/**
 * Create a soft-block response (credit exhausted)
 */
export function createSoftBlockResponse(result: {
  reason: string
  message: string
  action?: "topup"
  currentCredits?: number
  estimatedCredits?: number
}): Response {
  return new Response(
    JSON.stringify({
      error: "credit_exhausted",
      reason: result.reason,
      message: result.message,
      action: result.action ?? "topup",
      currentCredits: result.currentCredits,
      estimatedCredits: result.estimatedCredits,
    }),
    {
      status: 402,
      headers: { "Content-Type": "application/json" },
    }
  )
}
```

Lalu di bagian catch, panggil helper ini agar behavior konsisten:

```typescript
if (error instanceof Error && error.message.includes("Insufficient credits")) {
  return createSoftBlockResponse({
    reason: "insufficient_credit",
    message: error.message,
    action: "topup",
  })
}
```

**Step 4: Add QuotaCheckResult fields for credits**

Update `QuotaCheckResult` interface:

```typescript
export interface QuotaCheckResult {
  allowed: boolean
  tier: string
  reason?: string
  message?: string
  action?: "wait" | "upgrade" | "topup"
  warning?: string
  bypassed?: boolean
  currentBalance?: number
  requiredAmount?: number
  // Credit-specific
  currentCredits?: number
  estimatedCredits?: number
  isSoftBlocked?: boolean
}
```

**Step 5: Commit**

```bash
git add src/lib/billing/enforcement.ts
git commit -m "feat(enforcement): update for credit system

- Pass sessionId for soft-block tracking
- Handle insufficient credits as soft-block
- Add credit fields to QuotaCheckResult"
```

---

## Phase 5: UI Components

### Task 5.1: Update Plans Hub - Credit Display

**Files:**
- Modify: `src/app/(dashboard)/subscription/plans/page.tsx`

**Step 1: Update imports and types**

Add/update:

```typescript
interface CreditPackage {
  type: "paper" | "extension_s" | "extension_m"
  credits: number
  tokens: number
  priceIDR: number
  label: string
  description?: string
  ratePerCredit?: number
  popular?: boolean
}
```

**Step 2: Update query**

Replace `getTopupOptionsForPlan` with:

```typescript
const creditPackagesResult = useQuery(api.pricingPlans.getCreditPackagesForPlan, { slug: "bpp" })
```

**Step 3: Update balance display**

Change from IDR to credits:

```typescript
{currentTier === "bpp" && (
  <span className="ml-auto text-sm">
    Sisa: <strong>{creditBalance?.remainingCredits ?? 0} kredit</strong>
  </span>
)}
```

**Step 4: Update package selection UI**

Replace the amount selection with credit packages:

```typescript
{/* Package Selection */}
<div>
  <p className="text-sm font-medium mb-2">Pilih Paket</p>
  <div className="grid grid-cols-1 gap-2">
    {creditPackages.map((pkg) => (
      <button
        key={pkg.type}
        onClick={() => setSelectedPackage(pkg)}
        disabled={isProcessing}
        className={cn(
          "relative p-3 border rounded-lg text-left transition-colors",
          selectedPackage?.type === pkg.type
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
      >
        {pkg.popular && (
          <span className="absolute -top-2 right-2 text-[10px] font-medium bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
            Populer
          </span>
        )}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-semibold">{pkg.label}</span>
            <p className="text-sm text-muted-foreground">{pkg.description}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">Rp {pkg.priceIDR.toLocaleString("id-ID")}</p>
            <p className="text-xs text-muted-foreground">{pkg.credits} kredit</p>
          </div>
        </div>
        {selectedPackage?.type === pkg.type && (
          <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-primary" />
        )}
      </button>
    ))}
  </div>
</div>
```

**Catatan UX:** Extension hanya muncul jika user punya kredit aktif atau session sedang soft-block. Tambahkan kondisi render berdasarkan `creditBalance` dan/atau `isSoftBlocked`.

**Step 5: Update handleTopUp**

Change request body:

```typescript
body: JSON.stringify({
  packageType: selectedPackage.type,
  paymentMethod: selectedMethod,
  vaChannel: selectedMethod === "va" ? selectedVAChannel : undefined,
  ewalletChannel: selectedMethod === "ewallet" ? selectedEWalletChannel : undefined,
  mobileNumber: selectedMethod === "ewallet" && selectedEWalletChannel === "OVO" ? mobileNumber : undefined,
}),
```

**Step 6: Commit**

```bash
git add src/app/(dashboard)/subscription/plans/page.tsx
git commit -m "feat(ui): update Plans Hub for credit packages

- Display credit balance instead of IDR
- Show 3 packages (Paper/Extension S/Extension M)
- Update payment request with packageType"
```

---

### Task 5.2: Update Topup Page

**Files:**
- Modify: `src/app/(dashboard)/subscription/topup/page.tsx`

Apply similar changes as Task 5.1:
- Use `getCreditPackagesForPlan` instead of hardcoded options
- Display credits instead of tokens
- Send `packageType` in request

**Step 1: Apply changes**

(Similar pattern to 5.1)

**Step 2: Commit**

```bash
git add src/app/(dashboard)/subscription/topup/page.tsx
git commit -m "feat(ui): update Topup page for credit packages

- Use credit packages from API
- Display in kredit units
- Update payment request"
```

**Catatan:** Halaman topup belum ada realtime subscription status pembayaran. Kalau mau parity dengan Plans Hub, tambahkan `watchPaymentStatus` di page ini.

---

## Phase 6: Email Templates

### Task 6.1: Update Payment Email Templates

**Files:**
- Modify: `src/lib/email/sendPaymentEmail.ts`
- Modify: `src/lib/email/templates/PaymentSuccessEmail.tsx`

**Step 1: Update interface**

```typescript
interface PaymentSuccessParams {
  to: string
  userName?: string
  amount: number
  credits?: number
  newTotalCredits?: number
  transactionId: string
  paidAt: Date | number
}
```

**Step 2: Update email template**

Add credits display in template.

**Step 3: Commit**

```bash
git add src/lib/email/
git commit -m "feat(email): update payment emails for credit system

- Display credits purchased
- Show new total credits balance"
```

---

## Phase 7: Testing & Verification

### Task 7.1: End-to-End Verification

**Step 1: Verify credit packages query**

```bash
npm run convex -- run "pricingPlans:getCreditPackagesForPlan" --args '{"slug": "bpp"}'
```

Expected: 3 packages returned

**Step 2: Start dev server**

```bash
npm run dev
```

**Step 3: Manual test**

1. Go to `/subscription/plans`
2. Verify 3 packages displayed (Paper Rp 80K, Extension S Rp 25K, Extension M Rp 50K)
3. Select "Paket Paper"
4. Choose QRIS payment
5. Verify QR code displayed
6. Check console for payment creation log

**Step 4: Verify database**

```bash
npm run convex -- run "billing/usage:getUsageSummary" --args '{"periodStart": 0, "periodEnd": 9999999999999}'
```

---

## Summary

| Phase | Tasks | Files Modified |
|-------|-------|----------------|
| 1. Foundation | 5 | constants.ts, schema.ts |
| 2. Backend | 5 | credits.ts, payments.ts, pricingPlans.ts, **quotas.ts**, migrations |
| 3. API | 2 | topup/route.ts, xendit/route.ts |
| 4. Enforcement | 1 | enforcement.ts |
| 5. UI | 2 | plans/page.tsx, topup/page.tsx |
| 6. Email | 1 | email templates |
| 7. Testing | 1 | verification |

**Total: 17 tasks**

---

## Rollback Plan

If issues occur:
1. Revert to backup: `cp convex/billing/constants.ts.bak convex/billing/constants.ts`
2. Redeploy: `npx convex deploy --yes`
3. Legacy constants are preserved for backward compatibility
