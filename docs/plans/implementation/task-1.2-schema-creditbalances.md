# Task 1.2: Update Schema - creditBalances Table - Implementation Report

**Date:** 2026-01-30
**Status:** DONE
**Commit:** `4c97ca9`

---

## Summary

Updated `creditBalances` table in `convex/schema.ts` to support credit-based tracking instead of IDR-based tracking. Also added minimal compatibility fix to `credits.ts` to ensure compilation.

---

## Schema Changes

### New Required Fields

```typescript
totalCredits: v.number(),       // Total kredit yang dibeli
usedCredits: v.number(),        // Kredit yang sudah terpakai
remainingCredits: v.number(),   // Sisa kredit (computed: total - used)
totalPurchasedCredits: v.number(), // Total kredit dibeli sepanjang waktu
totalSpentCredits: v.number(),     // Total kredit dipakai sepanjang waktu
```

### New Optional Fields (Purchase Tracking)

```typescript
lastPurchaseAt: v.optional(v.number()),
lastPurchaseType: v.optional(v.string()), // "paper" | "extension_s" | "extension_m"
lastPurchaseCredits: v.optional(v.number()),
```

### Legacy Fields (Now Optional)

```typescript
balanceIDR: v.optional(v.number()),
balanceTokens: v.optional(v.number()),
totalTopUpIDR: v.optional(v.number()),
totalSpentIDR: v.optional(v.number()),
lastTopUpAt: v.optional(v.number()),
lastTopUpAmount: v.optional(v.number()),
```

---

## Compatibility Fix (credits.ts)

Since changing required fields in schema causes type errors in dependent code, minimal fixes were applied to `credits.ts`:

### 1. Insert Calls - Added New Required Fields

```typescript
// Added to initializeCreditBalance and addCredits insert calls:
totalCredits: 0,
usedCredits: 0,
remainingCredits: 0,
totalPurchasedCredits: 0,
totalSpentCredits: 0,
```

### 2. Field Access - Added Null Coalescing

```typescript
// Before (errors because fields are now optional):
balance.balanceIDR + args.amountIDR

// After:
(balance.balanceIDR ?? 0) + args.amountIDR
```

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
| `convex/schema.ts` | Modified (creditBalances table updated) |
| `convex/billing/credits.ts` | Modified (compatibility fix) |

---

## Notes

- **Backward Compatible:** Legacy fields are now optional, so existing documents won't break
- **Migration Path:** New records will have both credit-based and legacy fields
- **Full Rewrite Pending:** `credits.ts` will be fully rewritten in Task 2.1 to use credit-based logic
- **Index Preserved:** `by_user` index unchanged
