# Implementation Plan: Fix Partial Failure in unapproveStage Loop

## Problem Statement

`handleCancelChoice` and `handleCancelApproval` in `ChatWindow.tsx` call `unapproveStage` mutation N times in a sequential loop. Each call is an independent Convex transaction. If call K fails, K-1 mutations are already committed — causing backend/UI desync with no recovery path. The loop count is derived from local UIMessage state, which can desync from actual Convex state.

## Solution

Extend the existing `rewindToStage` mutation (already atomic, production-proven) with a `mode` parameter to handle cancel operations. Replace the client-side sequential loop with a single atomic mutation call that accepts `targetStage` (server-validated) instead of a client-derived `count`.

## Why Not a New Mutation

The codebase already has `rewindToStage` (line 2131) and `unapproveStage` (line 866) in `convex/paperSessions.ts`. Creating a third rollback mutation (`unapproveMultipleStages`) would duplicate 80% of logic and create a maintenance trap. `rewindToStage` already handles: atomic multi-stage rollback, `clearValidatedAt`, `markDigestAsSuperseded`, `invalidateArtifactsForStages`, `rebuildNaskahSnapshot` (1x), `rewindHistory` logging. The gaps are small and addressable with a mode parameter.

## Gap Analysis: `rewindToStage` vs `unapproveStage` Loop

| Behavior | `rewindToStage` (current) | `unapproveStage` (per-call) | Gap |
|---|---|---|---|
| `stageStatus` output | `"drafting"` | `"pending_validation"` | Mode-dependent |
| `stageMessageBoundaries` | Not touched | Removes entries for rolled-back stages | Add to cancel modes |
| Artifact title re-prefix | Not done | Re-adds `"Draf "` prefix via `titleStrippedOnApproval` | Add to cancel modes |
| `decisionEpoch` | Not incremented | Incremented per call | Increment 1x in cancel modes |
| Intermediate stage stageData | Only removes `validatedAt` | Clears entirely (`= {}`) | Add full clear for cancel modes |
| `cancelChoiceDecision` logic | N/A | N/A (separate mutation) | Fold into `cancel-choice` mode |
| `stageStatus` guard | No guard | Throws if `"revision"` | Add guard for cancel modes |
| `rewindHistory` record | Yes | No | Keep — useful for cancel audit trail too |

## Audit Trail

This plan has been through 2 rounds of reviewer+auditor dispatch. Key corrections applied:

- **C1 (CONFIRMED):** `[Approved: X]` stores display label, not stage ID. Added Phase 0 with `getStageIdFromLabel` reverse lookup.
- **C2 (CONFIRMED):** `getStagesToInvalidate` excludes `currentStage` from invalidation set. Fixed in Task 1.4 addendum.
- **C3 (FALSE POSITIVE):** Auditor claimed `validatedAt` guard blocks cancel-choice. Disproven — cross-stage cancel-choice target always has `validatedAt` (was approved to reach later stages).
- **I1 (ADDRESSED):** `editAndTruncate` failure after successful `rewindToStage` leaves non-retryable state. Fixed with separated try-catch in Task 2.6.
- **I2 (ADDRESSED):** Bulk boundary filter may over-remove. Fixed with stack-pop semantics in Task 1.5.
- **I3 (ACKNOWLEDGED):** `paper-tools.ts` also has non-atomic `rewindToStage` + `cancelChoiceDecision` sequence. Documented as out-of-scope.
- **I4 (ADDRESSED):** `rewindHistory` schema needs `mode` field for observability. Added to Task 1.1.

---

## Phases

---

### Phase 0: Add `getStageIdFromLabel` Reverse Lookup

**File:** `convex/paperSessions/constants.ts`

#### Task 0.1: Add `getStageIdFromLabel` function

Place adjacent to existing `getStageLabel` (line 42). This is the logical inverse:

```typescript
export function getStageIdFromLabel(label: string): PaperStageId | undefined {
    const trimmed = label.trim();
    return STAGE_ORDER.find((candidate) => getStageLabel(candidate) === trimmed);
}
```

Design notes:
- Uses `STAGE_ORDER.find` + existing `getStageLabel` (same pattern as `src/lib/paper/approval-copy.ts` line 23 — now DRY-ed into constants)
- Returns `undefined` for unrecognized labels (including legacy "Elaborasi Outline") — caller handles gracefully
- No hardcoded map needed — derives from existing `getStageLabel`, so if labels change, this stays in sync automatically

#### Task 0.2: Update `approval-copy.ts` to use `getStageIdFromLabel`

`src/lib/paper/approval-copy.ts` line 23 currently inlines the same lookup. Replace with:

```typescript
import { getStageIdFromLabel } from "../../../convex/paperSessions/constants"
// ...
const stageId = getStageIdFromLabel(normalizedLabel)
```

This eliminates the duplicated lookup pattern.

---

### Phase 1: Extend `rewindToStage` Server-Side

**File:** `convex/paperSessions.ts`, `rewindToStage` mutation (line 2131)

#### Task 1.1: Add `mode` argument

Add optional `mode` arg to `rewindToStage`:

```typescript
args: {
    sessionId: v.id("paperSessions"),
    userId: v.id("users"),
    targetStage: v.string(),
    mode: v.optional(v.union(
        v.literal("rewind"),         // existing behavior (default)
        v.literal("cancel-approval"),
        v.literal("cancel-choice")
    )),
},
```

Default `mode` to `"rewind"` when omitted — preserves backward compatibility with all 5 existing callers:
- `usePaperSession.ts` hook (consumed by ChatWindow, SidebarProgress, SidebarQueueProgress)
- `paper-tools.ts` `resetToStage` tool (AI model caller)

**I4 fix:** Also add `mode` to `rewindHistory` insert (line 2182) for observability:
```typescript
await ctx.db.insert("rewindHistory", {
    ...existingFields,
    mode: mode ?? "rewind",  // requires adding mode: v.optional(v.string()) to rewindHistory schema
});
```

#### Task 1.2: Add `stageStatus === "revision"` guard for cancel modes

After the existing guards (line 2146-2156), add:

```typescript
// Guard: cancel modes cannot interrupt an active revision
if (mode !== "rewind" && session.stageStatus === "revision") {
    throw new Error(`Cannot cancel: revision in progress on "${session.currentStage}"`);
}
```

This preserves the guard from `unapproveStage` (line 881). The existing `"rewind"` mode has no such guard (rewind is an explicit admin/user action that overrides).

#### Task 1.3: Mode-dependent `stageStatus` output

Currently hardcoded at line 2202: `stageStatus: "drafting"`. Change to:

```typescript
stageStatus: mode === "cancel-approval" ? "pending_validation" : "drafting",
```

- `"rewind"` → `"drafting"` (unchanged, model re-drafts)
- `"cancel-approval"` → `"pending_validation"` (artifact still valid, user can re-approve)
- `"cancel-choice"` → `"drafting"` (choice invalidated, model presents new choices)

#### Task 1.4: Include `currentStage` in invalidation set + full stageData clear for cancel modes

**CRITICAL (C2 fix):** `getStagesToInvalidate(targetStage, currentStage)` returns stages from targetIndex to currentIndex **EXCLUSIVE** of currentIndex (verified: line 2031 `for i < currentIndex`). This means `currentStage` is NOT in the set. But `unapproveStage`'s first iteration always clears `nextStageToClear = session.currentStage`. For cancel modes, `currentStage` must also be invalidated.

**Simplified approach (audit-verified):** Push `currentStage` into `stagesToInvalidate` for cancel modes. All helper functions then handle it automatically — no separate code needed.

```typescript
// After line 2161:
const stagesToInvalidate = getStagesToInvalidate(args.targetStage, currentStage);

// C2 FIX: include currentStage for cancel modes (exclusive range misses it)
if (mode !== "rewind" && currentStage !== "completed") {
    stagesToInvalidate.push(currentStage);
}
```

**Why this is safe (all verified by audit):**
- `getStagesToInvalidate` returns a mutable plain array (line 2030: `const stagesToInvalidate: string[] = []`)
- `currentStage !== targetStage` guaranteed by `isValidRewindTarget` guard (line 2002: rejects `targetIndex >= currentIndex`)
- `currentStage` can never already be in the set (exclusive range ends before currentIndex)
- `invalidateArtifactsForStages` reads from ORIGINAL `stageData` parameter (line 2173), not from updated copy — so artifact lookup works correctly even for the pushed stage
- Push happens BEFORE `rewindHistory` insert (line 2182) — history correctly includes `currentStage`
- All stageData consumers use optional chaining — `{}` vs `undefined` makes no difference

**Additionally:** For cancel modes, intermediate stages need full clear (`= {}`), not just `validatedAt` removal. Create `clearStageDataForCancel` (used instead of `clearValidatedAt` when `mode !== "rewind"`):

```typescript
function clearStageDataForCancel(
    stageData: Record<string, Record<string, unknown>>,
    stagesToInvalidate: string[],
    targetStage: string
): Record<string, Record<string, unknown>> {
    const updated = { ...stageData };
    
    for (const stage of stagesToInvalidate) {
        if (stage === targetStage) {
            // Target stage: remove validatedAt only (rest preserved for re-approval)
            // cancel-choice target gets different treatment in Task 1.6
            const { validatedAt: _, ...rest } = updated[stage] ?? {};
            updated[stage] = rest;
        } else {
            // All other stages (intermediates + currentStage): full clear
            updated[stage] = {};
        }
    }
    
    return updated;
}
```

Since `currentStage` is now IN `stagesToInvalidate` and `currentStage !== targetStage` (guaranteed), it hits the `else` branch → cleared to `{}`. No separate handling needed.

#### Task 1.5: Remove `stageMessageBoundaries` entries for cancel modes (stack-pop semantics)

**I2 fix:** `unapproveStage` removes only the LAST boundary entry per call (stack-pop). A flat filter would over-remove if a stage was approved more than once (rewind + re-approve scenario). Use stack-pop semantics: pop entries from the end that match invalidated stages.

```typescript
if (mode !== "rewind") {
    const existingBoundaries = (session.stageMessageBoundaries as Array<{
        stage: string; firstMessageId: string; lastMessageId: string; messageCount: number;
    }>) || [];
    
    // Stack-pop: remove entries from the end that belong to invalidated stages
    // (currentStage is already in stagesToInvalidate after Task 1.4 push)
    const invalidatedSet = new Set(stagesToInvalidate);
    const updatedBoundaries = [...existingBoundaries];
    while (updatedBoundaries.length > 0) {
        const last = updatedBoundaries[updatedBoundaries.length - 1];
        if (invalidatedSet.has(last.stage)) {
            updatedBoundaries.pop();
        } else {
            break; // Stop at first non-invalidated entry
        }
    }
    // Include in the patch
}
```

This preserves earlier boundary entries for stages that were previously approved, rewound, and re-approved.

#### Task 1.6: Fold `cancelChoiceDecision` logic into `cancel-choice` mode

For `mode === "cancel-choice"`, the target stage needs `cancelChoiceDecision` treatment:

1. Invalidate target stage's artifact (set `invalidatedAt`)
2. Clear target stage's stageData but preserve `revisionCount`, `webSearchReferences`, and native ref field (`STAGE_NATIVE_REF_FIELD[targetStage]`)
3. `stageStatus` already set to `"drafting"` by Task 1.3

This replaces the separate `cancelChoiceDecision` mutation call in `handleCancelChoice`.

Ref: `cancelChoiceDecision` implementation at line 783-858.

#### Task 1.7: Artifact title re-prefix for cancel modes

For cancel modes, re-add `"Draf "` prefix to target stage's artifact title if `titleStrippedOnApproval` was set. Replicate logic from `unapproveStage` lines 956-966:

```typescript
if (mode !== "rewind" && targetStageData.titleStrippedOnApproval && targetStageData.artifactId) {
    try {
        const artifact = await ctx.db.get(targetStageData.artifactId as Id<"artifacts">);
        if (artifact && artifact.title && !/^draf(?:t)?\b/i.test(artifact.title)) {
            await ctx.db.patch(targetStageData.artifactId as Id<"artifacts">, {
                title: `Draf ${artifact.title}`,
            });
        }
    } catch {
        console.warn(`[PAPER][rewind-cancel] artifact title re-prefix failed`);
    }
}
```

#### Task 1.8: Increment `decisionEpoch` for cancel modes

Add epoch increment to the session patch for cancel modes:

```typescript
const currentEpoch = session.decisionEpoch ?? 0;
// ...
...(mode !== "rewind" ? { decisionEpoch: currentEpoch + 1 } : {}),
```

One increment is sufficient — the epoch guard in `build-on-finish-handler.ts` (line 172) only checks `!==`, so any change invalidates stale holders.

#### Task 1.9: Handle `completed` → last stage transition for cancel modes

Currently `unapproveStage` handles `isFinalApproval` (session.currentStage === "completed") by mapping to the last STAGE_ORDER entry. `rewindToStage` already handles this via `isValidRewindTarget` which treats "completed" as index `STAGE_ORDER.length`. Verify this path works correctly in cancel modes — the client must pass the actual stage name (e.g., "judul"), not "completed".

---

### Phase 2: Update Client Handlers

**File:** `src/components/chat/ChatWindow.tsx`

#### Task 2.1: Derive `targetStage` from message content using `getStageIdFromLabel`

**C1 fix:** Messages store display labels (`"Gagasan Paper"`), not stage IDs (`"gagasan"`). Must use `getStageIdFromLabel` (Phase 0) to convert.

Import at top of ChatWindow.tsx (already imports from this file at line 32):
```typescript
import { STAGE_ORDER, getStageIdFromLabel, type PaperStageId } from "../../../convex/paperSessions/constants"
```

Regex pattern (anchored, matches existing pattern in `MessageBubble.tsx` line 243):
```typescript
const APPROVED_REGEX = /^\[Approved:\s*(.+?)\]/;
```

**For `handleCancelApproval` (line 2697):**

```typescript
const approvalMessage = messages[syntheticMessageIndex];
const approvalText = approvalMessage.parts?.find(
    (p) => p.type === "text" && (p as { text?: string }).text?.startsWith("[Approved:")
) as { text: string } | undefined;
const labelMatch = approvalText?.text.match(APPROVED_REGEX);
const targetStage = labelMatch?.[1] ? getStageIdFromLabel(labelMatch[1]) : undefined;
if (!targetStage) {
    throw new Error(`Cannot derive stage ID from approval: "${approvalText?.text ?? "no text"}"`)
}
```

**For `handleCancelChoice` (line 2616):**

```typescript
const approvalsAfter = messages.slice(syntheticMessageIndex + 1).filter(
    (m) => m.role === "user" && m.parts?.some(
        (p) => p.type === "text" && (p as { text?: string }).text?.startsWith("[Approved:")
    )
);

if (approvalsAfter.length === 0) {
    // Same-stage cancel: no rollback needed, handled via cancelChoiceDecision only
} else {
    // Cross-stage: first approval after choice = the stage where choice was made
    const firstApproval = approvalsAfter[0];
    const firstApprovalText = firstApproval.parts?.find(
        (p) => p.type === "text" && (p as { text?: string }).text?.startsWith("[Approved:")
    ) as { text: string } | undefined;
    const labelMatch = firstApprovalText?.text.match(APPROVED_REGEX);
    const targetStage = labelMatch?.[1] ? getStageIdFromLabel(labelMatch[1]) : undefined;
    if (!targetStage) {
        throw new Error(`Cannot derive stage ID from approval: "${firstApprovalText?.text ?? "no text"}"`)
    }
}
```

**Error path:** If `getStageIdFromLabel` returns `undefined` (e.g., legacy "Elaborasi Outline" messages from old sessions), the throw is caught by existing catch block → Sentry capture + toast. No state mutation occurs before this point, so no inconsistency. The `finally` block in `handleCancelApproval` correctly resets `cancellingApprovalRef`.

#### Task 2.2: Replace `handleCancelApproval` loop with single mutation call

Replace lines 2710-2714:

```typescript
// OLD: sequential loop
// const totalUnapprovals = approvalsAfter.length + 1
// for (let j = 0; j < totalUnapprovals; j++) {
//     await unapproveStage({ sessionId: paperSession._id, userId })
// }

// NEW: single atomic call
await rewindToStage({
    sessionId: paperSession._id,
    userId,
    targetStage,
    mode: "cancel-approval",
});
```

Post-loop operations (`editAndTruncate`, `setMessages`) remain unchanged — they don't depend on intermediate loop states.

#### Task 2.3: Replace `handleCancelChoice` loop + `cancelChoiceDecision` with single mutation call

Replace lines 2628-2637:

```typescript
// OLD: sequential loop + separate cancelChoiceDecision
// if (isFromPastStage) {
//     for (let j = 0; j < approvalsAfter.length; j++) {
//         await unapproveStage(...)
//     }
// }
// await cancelChoiceDecision(...)

// NEW: single atomic call
if (isFromPastStage) {
    await rewindToStage({
        sessionId: paperSession._id,
        userId,
        targetStage,
        mode: "cancel-choice",
    });
} else {
    // Same-stage cancel: no rollback needed, only cancel the choice
    await cancelChoiceDecision({ sessionId: paperSession._id, userId });
}
```

Note: `cancelChoiceDecision` is still needed for the same-stage cancel case (no cross-stage rollback). Do NOT remove `cancelChoiceDecision` mutation.

#### Task 2.4: Remove `unapproveStage` from `useMutation` bindings

Remove the `unapproveStage` mutation binding from `ChatWindow.tsx` (around line 959). Add `rewindToStage` binding if not already present.

#### Task 2.5: Update useCallback dependency arrays

**CRITICAL:** Per memory `feedback_useeffect_dep_array.md` — NEVER change useEffect/useCallback dep array size without careful verification.

Current dep array counts:
- `handleCancelChoice` (line 2695): `[userId, paperSession?._id, conversationId, messages, historyMessages, cancelChoiceDecision, unapproveStage, editAndTruncate, setMessages]` = **9 deps**
- `handleCancelApproval` (line 2751): `[userId, paperSession?._id, conversationId, messages, historyMessages, unapproveStage, editAndTruncate, setMessages]` = **8 deps**

After change:
- `handleCancelChoice`: replace `unapproveStage` with `rewindToStage`. Keep `cancelChoiceDecision` (still used for same-stage). **9 deps** (unchanged).
- `handleCancelApproval`: replace `unapproveStage` with `rewindToStage`. **8 deps** (unchanged).

Both are 1:1 swaps. Size preserved.

#### Task 2.6: Separate try-catch for `editAndTruncate` (I1 fix)

**Problem:** If `rewindToStage` succeeds but `editAndTruncate` fails, the existing single try-catch catches everything — `setMessages` never runs, UI shows stale messages, and retry fails (target stage already rolled back, `validatedAt` gone).

**Fix:** Separate the post-rollback operations into their own try-catch so local state always updates:

```typescript
// PRIMARY: atomic rollback (if this fails, nothing happened)
await rewindToStage({ sessionId: paperSession._id, userId, targetStage, mode: "cancel-approval" });

// SECONDARY: message cleanup (failure here is recoverable — Convex reactivity will eventually sync)
try {
    const convexMsg = historyMessages?.find(...);
    if (convexMsg) {
        await editAndTruncate({ messageId: convexMsg._id, content: "", conversationId });
    }
} catch (truncateError) {
    Sentry.captureException(truncateError, { tags: { subsystem: "paper.cancel-truncate" } });
    console.warn("[CANCEL] editAndTruncate failed, local state will update anyway:", truncateError);
}

// ALWAYS: update local UI state regardless of truncation success
setMessages((prev) => prev.slice(0, syntheticMessageIndex));
```

This ensures:
- If `rewindToStage` fails → whole operation aborts, nothing changes (existing catch handles)
- If `editAndTruncate` fails → backend is rolled back correctly, UI updates locally, Convex reactivity will eventually reconcile the message truncation
- User can always see the correct state after cancel, even if message cleanup partially fails

---

### Phase 3: Cleanup

#### Task 3.1: Verify no other callers of `unapproveStage`

Grep entire codebase for `unapproveStage`. Audit confirmed only 2 callers (both in ChatWindow.tsx). If confirmed zero callers after Phase 2, proceed to removal.

#### Task 3.2: Remove `unapproveStage` mutation

Remove `unapproveStage` from `convex/paperSessions.ts` (lines 866-1008). This is ~140 lines of dead code elimination.

#### Task 3.3: Remove `cancelChoiceDecision` from `handleCancelChoice` import if applicable

`cancelChoiceDecision` is still needed for same-stage cancel (Task 2.3). Do NOT remove the mutation itself. Only clean up unused imports if any.

#### Task 3.4: Update `paper-tools.ts` to use `mode: "cancel-choice"` (T2 fix)

**File:** `src/lib/ai/paper-tools.ts`, `resetToStage` tool (~line 564-591)

Currently the AI `resetToStage` tool calls `rewindToStage` then `cancelChoiceDecision` sequentially (same non-atomic pattern). Now that `rewindToStage` supports `mode: "cancel-choice"`, this is a 3-line fix:

```typescript
// OLD (non-atomic):
// await retryMutation(() => fetchMutation(api.paperSessions.rewindToStage, { sessionId, userId, targetStage }))
// await retryMutation(() => fetchMutation(api.paperSessions.cancelChoiceDecision, { sessionId, userId }))

// NEW (atomic):
await retryMutation(() => fetchMutation(api.paperSessions.rewindToStage, {
    sessionId: session._id,
    userId: context.userId,
    targetStage,
    mode: "cancel-choice",
}))
```

Remove the separate `cancelChoiceDecision` call. Keep the `alreadyAtTarget` branch — when already at target, use `cancelChoiceDecision` directly (same-stage cancel, already atomic).

#### Task 3.5: Remove unused `getPreviousStage` import

After removing `unapproveStage`, the `getPreviousStage` import in `convex/paperSessions.ts` becomes dead. Remove it from the import statement (ESLint will flag this anyway).

---

### Phase 4: Testing

#### Task 4.1: Unit tests for extended `rewindToStage`

Test scenarios (in `convex/paperSessions.test.ts` or new test file):

1. **`mode: "rewind"` (default)** — existing behavior preserved, `stageStatus: "drafting"`, no epoch increment
2. **`mode: "cancel-approval"`, single stage** — `stageStatus: "pending_validation"`, target stage `validatedAt` removed, epoch incremented
3. **`mode: "cancel-approval"`, cross-stage (N=3)** — intermediate stages cleared, target stage only loses `validatedAt`, boundaries removed, digest superseded
4. **`mode: "cancel-choice"`, cross-stage** — intermediate stages cleared, target stage gets cancelChoiceDecision treatment. **Assert exact stageData shape:** `{ revisionCount: <preserved>, webSearchReferences: <preserved>, <STAGE_NATIVE_REF_FIELD>: <preserved> }`. Artifact invalidated. `stageStatus: "drafting"`.
5. **Guard: `stageStatus === "revision"`** — cancel modes throw, rewind mode does not
6. **Guard: invalid targetStage** — throws (existing behavior preserved)
7. **Edge: cancel from "completed" state** — handles `currentStage === "completed"` correctly
8. **Edge: cancel to "gagasan" (first stage)** — works without `getPreviousStage` issues
9. **Epoch: single increment** — verify `decisionEpoch` increments by exactly 1 regardless of rollback depth
10. **Naskah rebuild: called once** — verify `rebuildNaskahSnapshot` called 1x not N times
11. **Boundary stack-pop: rewind + re-approve + cancel** — create session, approve stages 1-5, rewind to stage 2, re-approve stages 2-4, then cancel-approval on stage 2. Verify boundaries are correctly popped (only the latest set, not the original pre-rewind entries).
12. **`currentStage` invalidation (C2)** — verify cancel-approval clears `currentStage` stageData to `{}` and invalidates its artifact

#### Task 4.2: Manual UI testing

1. Create a paper session, advance to stage 5+
2. Cancel approval on stage 2 → verify atomic rollback to stage 2, validation panel shows
3. Cancel choice on stage 3 from stage 6 → verify rollback + choice card re-activated
4. Same-stage cancel choice → verify `cancelChoiceDecision` path works
5. Try cancel during revision → verify error toast, no state change
6. Verify no UI flicker during cross-stage cancel (atomic jump, no intermediate renders)

---

## Files Modified

| File | Change |
|---|---|
| `convex/paperSessions/constants.ts` | Add `getStageIdFromLabel` (Task 0.1) |
| `src/lib/paper/approval-copy.ts` | Use `getStageIdFromLabel` instead of inline lookup (Task 0.2) |
| `convex/paperSessions.ts` | Extend `rewindToStage` with mode param (Tasks 1.1-1.9), remove `unapproveStage` (Task 3.2) |
| `convex/schema.ts` | Add `mode: v.optional(v.string())` to `rewindHistory` table (Task 1.1) |
| `src/components/chat/ChatWindow.tsx` | Update `handleCancelChoice` and `handleCancelApproval` (Tasks 2.1-2.6) |
| `src/lib/ai/paper-tools.ts` | Use `mode: "cancel-choice"` instead of separate `cancelChoiceDecision` call (Task 3.4) |
| Test files | Add tests (Task 4.1) |

## Files NOT Modified

| File | Reason |
|---|---|
| `convex/authHelpers.ts` | Auth unchanged |
| `PaperStageProgress.tsx` | Existing rewind UI uses `rewindToStage` with default mode, unaffected |
| `SidebarProgress.tsx`, `SidebarQueueProgress.tsx` | Same — use `usePaperSession.rewindToStage()` without mode |
| `src/lib/ai/paper-tools.ts` | ~~Out of scope~~ → Now included as Task 3.4 (3-line fix) |
| `build-on-finish-handler.ts` | Epoch guard works with single increment |
| `cancelChoiceDecision` mutation | Still needed for same-stage cancel |

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| `rewindToStage` backward compatibility | Default `mode` to `"rewind"` — 5 existing callers unaffected (verified: usePaperSession hook, paper-tools.ts) |
| useCallback dep array size change | Verified: both handlers are 1:1 swap (9→9, 8→8) |
| Convex transaction size limit (N=14) | Worst case ~23 doc ops, well under 8192 limit. Single `rebuildNaskahSnapshot` call. |
| `targetStage` parsing from message text | `getStageIdFromLabel` returns `undefined` for unrecognized labels → explicit throw BEFORE any mutation → Sentry capture + toast. Server also validates via `isValidRewindTarget`. Double safety net. |
| Legacy "Elaborasi Outline" messages | `getStageIdFromLabel` returns `undefined` → throw → toast "Gagal membatalkan". No corruption. These sessions are from pre-cancel-feature era and are inherently non-cancelable. |
| `cancelChoiceDecision` still separate for same-stage | Acceptable — same-stage cancel is already atomic (single mutation). The partial failure only exists in multi-mutation loops. |
| `editAndTruncate` failure after successful rollback | Separated try-catch (Task 2.6) ensures local UI always updates. Convex reactivity reconciles message state eventually. |
| `paper-tools.ts` non-atomic sequence | Fixed in Task 3.4 (3-line change). `alreadyAtTarget` branch still uses `cancelChoiceDecision` directly (same-stage, already atomic). |

## Tradeoffs Accepted (Audit-Verified)

| Tradeoff | Verdict | Rationale |
|---|---|---|
| Message text parsing (`[Approved: X]` regex) | ACCEPT | Pattern already established in 3 parse sites. Double safety net (throw + server validate). Not a state workflow trigger — just data extraction. |
| `judul`-specific `paperTitle`/`workingTitle` clearing not replicated | ACCEPT | Unreachable — `cancelableApprovalMessageIds` returns empty for `"completed"` state. Cancel button never renders for judul approval. Pre-existing gap in `rewindToStage` rewind mode too. |
| `rewindToStage` complexity increase | ACCEPT | Actual growth ~50-55 lines (total ~145-150), comparable to `approveStage` (154 lines). Mode-branching is correct pattern for Convex atomic mutations. |
| `decisionEpoch` +1 instead of +N | ACCEPT | Epoch guard checks `!==`, not magnitude. Any change invalidates stale holders. |
| Per-stage logging reduced to 1 log per operation | ACCEPT | `rewindHistory` record provides audit trail. Can add verbose logging if needed. |
