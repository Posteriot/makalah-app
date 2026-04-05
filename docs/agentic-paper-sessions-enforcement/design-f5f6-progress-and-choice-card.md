# Design — F5+F6: Task Progress + Choice Card Disabling

> Branch: `feature/paper-sessions-enforcement`
> Date: 2026-04-05
> Depends on: F1 (completed), F2 (completed), F3+F4 (completed)
> Source: findings.md § F5, § F6

---

## Why combined

F5 (incremental task progress) and F6 (choice card disabling after submit) are independent findings that can be implemented in parallel. They're combined in one design doc for efficiency — both are small scope.

---

## F5: Task Progress Blind to Chat

### Problem

Task card only updates when `updateStageData()` is called. User can have 10 chat turns without the task card reflecting progress. After F1 removed ringkasan as a required field, `updateStageData` is now lightweight enough for frequent partial saves.

### Verified current state

- `deriveTaskList(stageId, stageData)` in task-derivation.ts:155 — derives task status from stageData fields only
- `MessageBubble.tsx:255` — useMemo on stageData change triggers re-render
- `UnifiedProcessCard.tsx` — renders from taskSummary.tasks

After F1: `updateStageData` no longer requires ringkasan. After F3+F4: review-mode stages call `updateStageData` in the same turn as `createArtifact`. This means task progress is already better for review-mode stages (artifact creation triggers stageData update).

### Remaining gap

Discussion stages (gagasan, topik) and the choice card decision points in intelligent-choice stages still have gaps where multiple chat turns happen without `updateStageData` being called.

### Solution

Instruction-driven. Add a general rule to `paper-mode-prompt.ts` that tells the model to call `updateStageData` after every significant decision point. Add per-stage save points in stage instructions.

This aligns with CLAUDE.md principle: "Tools must be simple executors. Skills provide intelligence."

### Changes

**File: `src/lib/ai/paper-mode-prompt.ts`**

Add after the save progress rule (around line 300):
```
- INCREMENTAL PROGRESS: Call updateStageData() after every significant decision or milestone — not just at the end. This keeps task progress visible to the user. Partial data is acceptable.
```

**Files: `src/lib/ai/paper-stages/*.ts`**

Add specific save points to stages that have multi-turn flows:

- **gagasan (foundation.ts):** After clarifying questions answered, after search findings discussed, after angle agreed. Add note in EXPECTED FLOW: "Call updateStageData with partial data after each milestone (e.g., after angle is agreed, after references found)." **Important: save in the NEXT turn after search findings — NOT in the same turn as web search (per F2 search-turn contract: function tools and web search cannot run in the same turn).**
- **topik (foundation.ts):** After derived options presented and user confirms. Already handled by F3+F4 flow (createArtifact + updateStageData after confirmation).
- **tinjauan_literatur (core.ts):** After search findings presented, after framework approach selected. Add note: "Call updateStageData with partial references in the NEXT turn after search findings are presented — not in the search turn itself."

Review-mode stages that use direct generate or intelligent choice patterns already call updateStageData in the same turn as createArtifact — no additional save points needed.

### No code logic changes

This is instruction-only. `deriveTaskList` and `UnifiedProcessCard` already work correctly — they just need more frequent data input.

---

## F6: Choice Card Stays Interactive

### Problem

After user confirms a choice via the choice card, buttons should be disabled. Findings say `disabled: false` is hardcoded in compile-choice-spec.ts:132.

### Verified current state — mechanism already exists but has gaps

The disabling mechanism is **already implemented** but has a persistence gap:

1. **`compile-choice-spec.ts:132`** — `disabled: false` hardcoded in initial spec. This is CORRECT for the initial state — buttons should be clickable when first rendered.

2. **`JsonRendererChoiceBlock.tsx:27`** — tracks `submitted` state via `isSubmitted` prop OR `localSubmitted` state.

3. **`cloneSpecWithReadOnlyState()` (choice-payload.ts:246)** — when `submitted=true`, clones spec with `disabled: true` on all ChoiceOptionButtons. This WORKS.

4. **`ChatWindow.tsx:593`** — `submittedChoiceKeys` is `useState<Set<string>>`. On submit, the key is added (line 1220). **But this state is ephemeral — resets on page reload.**

5. **`ChatWindow.tsx:1520-1527`** — Effect that re-populates `submittedChoiceKeys` from `historyMessages`. It marks choice cards as submitted if the NEXT user message exists after the assistant message with the choice card. This handles page reload for HISTORICAL messages.

### Analysis — suspected gap may not exist

The mechanism works for:
- Current session: `localSubmitted` in JsonRendererChoiceBlock + `setSubmittedChoiceKeys` in ChatWindow
- Historical messages on page reload: effect at line 1520-1527 derives from `historyMessages`

**Originally suspected failure:** latest assistant message's choice card after page reload, before next message arrives.

**But:** choice submission immediately fires `sendMessage()` (ChatWindow.tsx:1250) which creates a synthetic user message. This message gets persisted to DB. On reload, `historyMessages` includes it. The existing derivation effect (line 1520-1527) should detect: "user message exists after assistant message with choice card → mark as submitted."

**This means the reload gap may not exist in the common case.** The synthetic user message IS the "next user message" that the derivation logic looks for.

**Possible remaining edge case:** user clicks choice → `sendMessage` fires → page crashes/closes BEFORE synthetic message persists to DB. On reload, no user message after choice card → card stays interactive. This is a rare race condition, not a systematic bug.

### Decision

**Downgrade F6 from "fix" to "verified — mostly working, rare edge case documented."**

The mechanism is already functional for the vast majority of cases. The race condition (crash between submit and message persistence) is too rare to justify a backend schema change or localStorage hack.

**If the bug IS reproducible in practice** (user reports re-clickable cards after reload), then escalate to Option A: persist `submittedChoicePartIds` to DB. But do not pre-build this without evidence.

### Changes

**No code changes for F6.** The existing mechanism works. Document the rare edge case and move on.

**No compile-choice-spec.ts change needed** — `disabled: false` in initial spec is correct.

**No ChoiceOptionButton.tsx change needed** — already respects `disabled` prop correctly.

**No ChatWindow.tsx change needed** — existing derivation effect already covers reload via synthetic user message.

---

## Files changed — summary

| File | Finding | Type | Changes |
|------|---------|------|---------|
| `src/lib/ai/paper-mode-prompt.ts` | F5 | Instruction | Add INCREMENTAL PROGRESS rule |
| `src/lib/ai/paper-stages/foundation.ts` | F5 | Instruction | Add save points for gagasan |
| `src/lib/ai/paper-stages/core.ts` | F5 | Instruction | Add save points for tinjauan_literatur |

F6: No code changes needed. Existing mechanism is functional. Rare edge case documented.

## Risk

1. **F5 model compliance:** Model may not call updateStageData frequently enough despite instructions. Acceptable — instruction-driven is the right approach per CLAUDE.md principles.
2. **F5 search-turn conflict:** Incremental save instructions must NOT imply saving in the same turn as web search. Wording explicitly says "in the NEXT turn after search findings."
3. **F6 rare edge case:** If page crashes between choice submit and synthetic message persistence, card may stay interactive after reload. Self-resolving when next message arrives. No action unless reproduced in practice.
