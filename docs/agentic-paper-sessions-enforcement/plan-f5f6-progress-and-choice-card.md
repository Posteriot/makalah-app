# Implementation Plan — F5+F6: Task Progress + Choice Card Disabling

> Branch: `feature/paper-sessions-enforcement`
> Date: 2026-04-05
> Design: `design-f5f6-progress-and-choice-card.md`
> Depends on: F1 (completed), F2 (completed), F3+F4 (completed)

---

## Execution Order

F5 is instruction-only. F6 requires no code changes — existing mechanism is verified functional.

---

### Step 1: Incremental progress instruction (F5)

**Goal:** Tell the model to call updateStageData more frequently for visible task progress.

**File 1: `src/lib/ai/paper-mode-prompt.ts`**

Add after the existing save progress rule (find "Save progress with updateStageData()"):

After that line, add:
```
- INCREMENTAL PROGRESS: Call updateStageData() after every significant decision or milestone — not just at the end. This keeps task progress visible to the user. Partial data is acceptable. IMPORTANT: Do NOT call updateStageData in the same turn as web search — save in the NEXT turn after search findings are presented.
```

**File 2: `src/lib/ai/paper-stages/foundation.ts` — gagasan**

In gagasan EXPECTED FLOW, after the "Share the actual findings from that search" step, add a note:

Find:
```
Share the actual findings from that search in the SAME response turn, then discuss potential angles with user
```

Add after (new line):
```
      ↓
In the NEXT turn (not the search turn): updateStageData with partial data after each milestone (angle agreed, references found)
```

**File 3: `src/lib/ai/paper-stages/core.ts` — tinjauan_literatur**

In tinjauan_literatur EXPECTED FLOW, after the "Present the actual literature findings" step, add:

Find:
```
Present the actual literature findings from that search
```

Add after (new line):
```
      ↓
In the NEXT turn (not the search turn): updateStageData with partial references after search findings are discussed
```

**Verification:**
- `npx tsc --noEmit` — must pass
- Read general rules to verify INCREMENTAL PROGRESS rule is coherent with F2's search-turn contract ("Do NOT call any function tool in a turn where you request web search")

---

### Step 2: F6 — No code changes needed

**Verified:** The choice card disabling mechanism is already functional.

**How it works:**
1. User clicks choice → `localSubmitted` set in `JsonRendererChoiceBlock` → buttons disabled immediately
2. `sendMessage()` fires (ChatWindow.tsx:1250) → synthetic user message persisted to DB
3. On page reload → `historyMessages` includes synthetic user message → derivation effect (line 1520-1527) detects "user message after assistant choice card" → marks as submitted

**Remaining edge case:** Page crash/close between choice submit and synthetic message DB persistence. Card stays interactive after reload until next message arrives. This is a rare race condition, not a systematic bug. No action unless reproduced in practice.

**If bug IS reproduced:** Escalate to persist `submittedChoicePartIds` to DB (Convex schema change). Do not pre-build without evidence.

---

### Step 3: Regression verification

**Automated:**
- `npx vitest run` — all tests must pass
- `npx tsc --noEmit` — clean

---

## Files changed — complete list

| # | File | Step | Type |
|---|------|------|------|
| 1 | `src/lib/ai/paper-mode-prompt.ts` | 1 | Instruction |
| 2 | `src/lib/ai/paper-stages/foundation.ts` | 1 | Instruction |
| 3 | `src/lib/ai/paper-stages/core.ts` | 1 | Instruction |

F6: No code changes. Existing mechanism verified functional.

## Commit strategy

1. `feat(f5): add incremental progress instruction for visible task updates`
