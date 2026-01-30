# Task 1.3: Update Schema - paperSessions Soft-Block Fields - Implementation Report

**Date:** 2026-01-30
**Status:** DONE
**Commit:** `031aa52`

---

## Summary

Added credit soft cap tracking fields to `paperSessions` table in `convex/schema.ts`. These fields enable per-session credit tracking and soft-block functionality for BPP users.

---

## Fields Added

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

---

## Field Descriptions

| Field | Type | Purpose |
|-------|------|---------|
| `creditAllotted` | `number?` | Total credits allocated for this paper session (default 300 for Paper package) |
| `creditUsed` | `number?` | Credits consumed during AI interactions in this session |
| `creditRemaining` | `number?` | Remaining credits (computed: allotted - used) |
| `isSoftBlocked` | `boolean?` | Flag indicating credit exhaustion (triggers Extension purchase prompt) |
| `softBlockedAt` | `number?` | Timestamp when soft-block was triggered |

---

## Usage

These fields will be updated by `deductCredits` mutation (Task 2.1):

```typescript
// When credits are deducted:
const sessionCreditUsed = (session.creditUsed ?? 0) + creditsToDeduct
const sessionCreditRemaining = (session.creditAllotted ?? 300) - sessionCreditUsed
const isSoftBlocked = sessionCreditRemaining <= 0

await ctx.db.patch(sessionId, {
  creditUsed: sessionCreditUsed,
  creditRemaining: sessionCreditRemaining,
  isSoftBlocked,
  ...(isSoftBlocked ? { softBlockedAt: Date.now() } : {}),
})
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
| `convex/schema.ts` | Modified (+9 lines in paperSessions table) |

---

## Notes

- **All fields optional:** Existing paper sessions unaffected
- **Location:** Fields added after `estimatedTokenUsage` section, before Timestamps
- **Paper workflow unchanged:** Per constraints, no changes to paper workflow logic
- **UI integration:** `isSoftBlocked` will be used by chat UI to show Extension purchase prompt
