# Task 1.1: Update Billing Constants - Implementation Report

**Date:** 2026-01-30
**Status:** DONE
**Commit:** `2f9d83d`

---

## Summary

Implemented credit system constants in `convex/billing/constants.ts` to support the BPP migration from IDR-based billing to credit-based billing.

---

## Changes Made

### 1. New Credit System Constants

```typescript
// Credit conversion rate
export const TOKENS_PER_CREDIT = 1_000

// Paper soft cap
export const PAPER_CREDITS = 300
export const PAPER_TOKENS = 300_000
export const PAPER_PRICE_IDR = 80_000

// Internal cost estimation
export const CREDIT_COST_IDR = 22.40
```

### 2. Credit Packages Array

```typescript
export const CREDIT_PACKAGES = [
  { type: "paper", credits: 300, tokens: 300_000, priceIDR: 80_000, ... },
  { type: "extension_s", credits: 50, tokens: 50_000, priceIDR: 25_000, ... },
  { type: "extension_m", credits: 100, tokens: 100_000, priceIDR: 50_000, ... },
] as const
```

### 3. Helper Functions

| Function | Purpose |
|----------|---------|
| `tokensToCredits(tokens)` | Convert tokens to credits (ceiling) |
| `creditsToTokens(credits)` | Convert credits to tokens |
| `getPackageByType(type)` | Find package by type |
| `isValidPackageType(type)` | Type guard for package types |

### 4. Updated Token Pricing

Changed `TOKEN_PRICE_PER_1K_IDR` from `3` to `22.40` to reflect actual Gemini 2.5 Flash pricing:
- Input: $0.30/1M = Rp 4.80/1K tokens
- Output: $2.50/1M = Rp 40.00/1K tokens
- Blended average (50:50): Rp 22.40/1K tokens

### 5. Deprecated Legacy Constants

Marked as `@deprecated`:
- `TOKENS_PER_IDR`
- `BPP_PAPER_TOKENS_ESTIMATE`
- `BPP_PAPER_PRICE_IDR`
- `TOP_UP_PACKAGES`
- `calculateTokensFromIDR()`

---

## Preserved (Critical Dependencies)

The following were preserved because they are used by `usage.ts`:
- `TOKEN_PRICE_PER_1K_IDR`
- `calculateCostIDR()`

---

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript (`npx tsc --noEmit -p convex/tsconfig.json`) | PASS |
| Lint (`npm run lint -- --max-warnings=0`) | PASS |
| Build (`npm run build`) | PASS |

---

## Files Changed

| File | Action |
|------|--------|
| `convex/billing/constants.ts` | Modified (+136 lines, -24 lines) |
| `convex/billing/constants.ts.bak` | Created (backup) |

---

## Notes

- File reorganized with clear section headers using `═` separator
- All existing functionality preserved
- No breaking changes to existing consumers
