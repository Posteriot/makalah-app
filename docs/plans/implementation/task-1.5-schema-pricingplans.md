# Task 1.5: Update Schema - pricingPlans Table - Implementation Report

**Date:** 2026-01-30
**Status:** DONE
**Commit:** `73bf3ba`

---

## Summary

Added `creditPackages` array field to `pricingPlans` table in `convex/schema.ts`. This field stores the new credit-based package options that will replace the deprecated `topupOptions`.

---

## Field Added

```typescript
// Credit packages (new system - replaces topupOptions)
creditPackages: v.optional(
  v.array(
    v.object({
      type: v.union(
        v.literal("paper"),
        v.literal("extension_s"),
        v.literal("extension_m")
      ),
      credits: v.number(),
      tokens: v.number(),
      priceIDR: v.number(),
      label: v.string(),
      description: v.optional(v.string()),
      ratePerCredit: v.optional(v.number()),
      popular: v.optional(v.boolean()),
    })
  )
),
```

---

## Field Schema

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `union` | Yes | "paper" / "extension_s" / "extension_m" |
| `credits` | `number` | Yes | 300, 50, or 100 |
| `tokens` | `number` | Yes | 300000, 50000, or 100000 |
| `priceIDR` | `number` | Yes | 80000, 25000, or 50000 |
| `label` | `string` | Yes | "Paket Paper", "Extension S", "Extension M" |
| `description` | `string` | No | Package description |
| `ratePerCredit` | `number` | No | Rp per credit (267 or 500) |
| `popular` | `boolean` | No | Highlight flag |

---

## Deprecation

```typescript
// BPP topup options (synced from TOP_UP_PACKAGES in billing/constants.ts)
// @deprecated Use creditPackages instead
topupOptions: v.optional(...)
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
| `convex/schema.ts` | Modified (+20 lines in pricingPlans table) |

---

## Notes

- **Deploy skipped:** Will batch deploy after all Phase 1 schema changes complete
- **Migration pending:** Task 2.4 will populate `creditPackages` for BPP plan
- **Query pending:** Task 2.3 will add `getCreditPackagesForPlan` query
- **Backward compatible:** `topupOptions` kept but marked deprecated
