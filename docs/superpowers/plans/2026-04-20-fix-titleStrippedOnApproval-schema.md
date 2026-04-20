# Fix titleStrippedOnApproval Schema Validation Error

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `titleStrippedOnApproval: v.optional(v.boolean())` to all stage validators so `approveStage` can write the cancel-decision title-strip flag without schema rejection.

**Architecture:** The field is written by `approveStage` (internal mutation) when an artifact title's "Draf" prefix is stripped on approval. It's read by `unapproveStage` to conditionally re-add the prefix on reversal. The schema validators in two locations (inline in `schema.ts`, exported from `types.ts`) must both include this field. The `stageDataWhitelist.ts` does NOT need updating because this field is set internally, not from model input.

**Tech Stack:** Convex schema validators

**Root Cause:** cancel-decision feature (commit `0a50e3b1`) added `titleStrippedOnApproval: true` to `updatedStageData[currentStage]` in `approveStage` but never added the field to schema validators. Convex strict schema validation rejects the patch. The bug was latent — only triggers when an artifact title starts with "Draf"/"Draft" (regex: `/^draf(?:t)?\b/i`), which commonly happens at abstrak stage onward.

**Impact:** `approveStage` fails for ANY stage where the artifact title starts with "Draf". Core workflow completely blocked.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `convex/schema.ts` | Modify lines 543-680 | Add field to 6 inline stage validators |
| `convex/paperSessions/types.ts` | Modify lines 35-305 | Add field to 9 exported stage validators |

**NOT modified:**
- `convex/paperSessions/stageDataWhitelist.ts` — whitelist governs external model input; `titleStrippedOnApproval` is set internally by `approveStage`, not by model tools
- `convex/paperSessions.ts` — the code that writes/reads this field is already correct

---

## Task 1: Add `titleStrippedOnApproval` to inline stage validators in schema.ts

**Files:**
- Modify: `convex/schema.ts` (6 inline stage validators)

The 6 inline validators in schema.ts are: gagasan, topik, abstrak, pendahuluan, tinjauan_literatur, metodologi. Each needs `titleStrippedOnApproval: v.optional(v.boolean())` added before the closing `}))`.

- [ ] **Step 1: Add field to gagasan validator (line ~565)**

After `revisionCount: v.optional(v.number()),` add:
```typescript
        titleStrippedOnApproval: v.optional(v.boolean()),
```

- [ ] **Step 2: Add field to topik validator (line ~589)**

After `revisionCount: v.optional(v.number()),` add:
```typescript
        titleStrippedOnApproval: v.optional(v.boolean()),
```

- [ ] **Step 3: Add field to abstrak validator (line ~610)**

After `revisionCount: v.optional(v.number()),` add:
```typescript
        titleStrippedOnApproval: v.optional(v.boolean()),
```

- [ ] **Step 4: Add field to pendahuluan validator (line ~634)**

After `revisionCount: v.optional(v.number()),` add:
```typescript
        titleStrippedOnApproval: v.optional(v.boolean()),
```

- [ ] **Step 5: Add field to tinjauan_literatur validator (line ~660)**

After `revisionCount: v.optional(v.number()),` add:
```typescript
        titleStrippedOnApproval: v.optional(v.boolean()),
```

- [ ] **Step 6: Add field to metodologi validator (line ~679)**

After `revisionCount: v.optional(v.number()),` add:
```typescript
        titleStrippedOnApproval: v.optional(v.boolean()),
```

- [ ] **Step 7: Verify no inline validator was missed**

Run: `grep -n "revisionCount.*v\.optional.*v\.number" convex/schema.ts | head -10`
Expected: 6 matches (one per inline stage). Each should have `titleStrippedOnApproval` on the next line.

- [ ] **Step 8: Commit**

```bash
git add convex/schema.ts
git commit -m "fix(schema): add titleStrippedOnApproval to 6 inline stage validators"
```

### CHECKPOINT Task 1
STOP. Dispatch audit agent to verify: all 6 inline validators have the field, no existing fields were removed or modified, field uses `v.optional(v.boolean())`.

---

## Task 2: Add `titleStrippedOnApproval` to exported stage validators in types.ts

**Files:**
- Modify: `convex/paperSessions/types.ts` (15 exported validators)

All 15 exported validators: GagasanData, TopikData, AbstrakData, PendahuluanData, TinjauanLiteraturData, MetodologiData, HasilData, DiskusiData, KesimpulanData, PembaruanAbstrakData, DaftarPustakaData, LampiranData, JudulData, OutlineData, GenericStageData. GagasanData through MetodologiData are duplicates of inline schema — still must be updated for consistency.

All 15 exported validators need the field added after `revisionCount`.

- [ ] **Step 1: Add field to all exported validators**

For each of the 15 `v.object({...})` definitions in types.ts, add after `revisionCount: v.optional(v.number()),`:
```typescript
    titleStrippedOnApproval: v.optional(v.boolean()),
```

Validators to update (in order):
1. GagasanData (line ~52)
2. TopikData (line ~72)
3. AbstrakData (line ~85)
4. PendahuluanData (line ~101)
5. TinjauanLiteraturData (line ~123)
6. MetodologiData (line ~138)
7. HasilData (line ~156)
8. DiskusiData (line ~175)
9. KesimpulanData (line ~190)
10. PembaruanAbstrakData (line ~204)
11. DaftarPustakaData (line ~233)
12. LampiranData (line ~255)
13. JudulData (line ~274)
14. OutlineData (line ~296)
15. GenericStageData (line ~304)

- [ ] **Step 2: Verify count**

Run: `grep -c "titleStrippedOnApproval" convex/paperSessions/types.ts`
Expected: 15

- [ ] **Step 3: Commit**

```bash
git add convex/paperSessions/types.ts
git commit -m "fix(schema): add titleStrippedOnApproval to all 15 exported stage validators in types.ts"
```

### CHECKPOINT Task 2
STOP. Dispatch audit agent to verify: all 15 validators have the field, count matches, no existing fields removed.

---

## Task 3: Verify end-to-end

- [ ] **Step 1: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: Zero errors

- [ ] **Step 2: Push schema to Convex**

Run: `npx convex dev --once 2>&1 | tail -5`
Expected: Schema accepted, functions ready

- [ ] **Step 3: Verify the fix**

Run dev server → navigate to a session → approve abstrak stage (with an artifact that has "Draf" prefix).
Expected: Approval succeeds, no schema validation error.

- [ ] **Step 4: Verify existing tests still pass**

Run: `npx vitest run src/components/chat/layout/ChatLayout.sidebar-tree.test.tsx`
Expected: 4/4 pass

- [ ] **Step 5: Final commit (if any fixes needed)**

---

## What This Does NOT Change

1. **stageDataWhitelist.ts** — `titleStrippedOnApproval` is set internally by `approveStage`, not by model tools. Adding it to the whitelist would let the model set this flag, which is wrong.
2. **paperSessions.ts** — The code that writes (`approveStage:1522-1525`) and reads (`unapproveStage:956`) this field is already correct.
3. **No behavioral change** — This only makes the schema accept a field that was already being written. No new functionality.
