# Edit/Resend Choice Card Reset — Implementation Plan

**Goal:** When user edits/resends a confirmed choice card message before artifact creation, reset stageData so model presents a fresh choice card instead of silently finalizing from stale data.

**Approach:** Deterministic stageData reset. Two file changes: one Convex mutation, one ChatWindow.tsx call site.

**Context:** See `context-problem.md` in this directory.

---

### Task 1: Add `resetStageDataForEditResend` Mutation

**File:** `convex/paperSessions.ts`

**Step 1: Add mutation after `ensurePaperSessionExists` (~line 690)**

```typescript
/**
 * Reset stageData for the current stage when user edits/resends
 * a confirmed choice card before artifact creation.
 *
 * Guard: only resets if stageData has fields but NO artifactId.
 * This means the choice flow was interrupted (updateStageData ran
 * but createArtifact didn't). If artifactId exists, the stage was
 * already completed/in-revision — don't touch.
 *
 * Preserves: revisionCount (revision history must survive edit/resend).
 * Clears: all other fields (angle, analisis, temuanUtama, etc.)
 */
export const resetStageDataForEditResend = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== args.userId) throw new Error("Unauthorized");

        const currentStage = session.currentStage;
        if (!STAGE_ORDER.includes(currentStage as PaperStageId)) {
            return { reset: false, reason: "not_a_stage" };
        }

        const stageData = session.stageData as Record<string, Record<string, unknown>>;
        const currentStageData = stageData[currentStage];

        // Guard: only reset if has data but no artifact (choice flow interrupted)
        if (!currentStageData || currentStageData.artifactId) {
            return {
                reset: false,
                reason: currentStageData?.artifactId ? "has_artifact" : "no_data",
            };
        }

        // Preserve revisionCount only
        const revisionCount = typeof currentStageData.revisionCount === "number"
            ? currentStageData.revisionCount : 0;
        const clearedFields = Object.keys(currentStageData).filter(k => k !== "revisionCount");

        if (clearedFields.length === 0) {
            return { reset: false, reason: "nothing_to_clear" };
        }

        const updatedStageData = { ...stageData };
        updatedStageData[currentStage] = { revisionCount };

        await ctx.db.patch(args.sessionId, {
            stageData: updatedStageData,
            updatedAt: Date.now(),
        });

        console.info(
            `[PAPER][edit-resend-reset] stage=${currentStage} cleared=[${clearedFields.join(",")}]`
        );
        return { reset: true, stage: currentStage, clearedFields };
    },
});
```

**Step 2: Commit**

```bash
git add convex/paperSessions.ts
git commit -m "feat: resetStageDataForEditResend mutation for choice card edit/resend"
```

---

### Task 2: Call Mutation from ChatWindow.tsx handleEdit

**File:** `src/components/chat/ChatWindow.tsx`

**Step 1: Add mutation hook**

Near the other paper session mutations (around line 627 area where `usePaperSession` is called), add:

```typescript
const resetStageDataForEditResendMutation = useMutation(api.paperSessions.resetStageDataForEditResend)
```

**Step 2: Add reset call in handleEdit**

In `handleEdit` (line 1975+), AFTER `editAndTruncate` (line 2034) and BEFORE sending the new message (line 2093), add:

```typescript
// Reset stageData on edit/resend when stage is incomplete (no artifact yet).
// Fires for ANY edit/resend mid-stage, not just choice card confirmations.
// This is intentional: edit/resend = "restart this stage from scratch".
if (isPaperMode && paperSession && userId) {
    const currentStageData = stageData?.[paperSession.currentStage as string];
    if (currentStageData && !currentStageData.artifactId) {
        try {
            const resetResult = await resetStageDataForEditResendMutation({
                sessionId: paperSession._id,
                userId,
            });
            if (resetResult.reset) {
                console.info(`[PAPER][edit-resend-reset] Client: stage=${resetResult.stage} cleared=${resetResult.clearedFields?.length ?? 0} fields`);
            }
        } catch (err) {
            console.warn("[PAPER][edit-resend-reset] Failed:", err);
            // Non-blocking — proceed with edit/resend even if reset fails
        }
    }
}
```

**Important placement:** This MUST run:
- AFTER `editAndTruncate` (messages already truncated in DB)
- AFTER `markStageAsDirty` (line 2041-2043)
- BEFORE `sendUserMessageWithContext` (line 2093 — the new message that triggers AI)

This ensures stageData is clean BEFORE the model processes the new request.

**Step 3: Run type check**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "feat: reset stageData on edit/resend of incomplete stage"
```

---

### Task 3: Deploy and Verify

**Step 1: Deploy Convex**

```bash
npx convex dev --once
```

**Step 2: Type check**

```bash
npx tsc --noEmit
```

**Step 3: Commit deploy confirmation**

---

## Behavioral Contract

### When reset triggers:
- User edits/resends ANY message during an incomplete stage
- Paper mode is active (`isPaperMode && paperSession`)
- Current stage has stageData (`stageData[currentStage]` exists)
- Current stage has NO artifact (`!stageData[currentStage].artifactId`)

This is intentionally broad: edit/resend = "restart this stage from scratch" regardless of which message was edited or whether a choice card was involved. Consistent, predictable behavior.

### When reset does NOT trigger:
- Not in paper mode
- No stageData for current stage (nothing to clear)
- Current stage already has artifact (stage was completed — this is revision territory)
- Current stage is "completed" (not a valid STAGE_ORDER member)

### What gets cleared:
- All stageData fields for current stage EXCEPT `revisionCount`
- Examples: `ideKasar`, `analisis`, `angle`, `novelty`, `temuanUtama`, `metodePenyajian`, etc.

### What gets preserved:
- `revisionCount` — revision history
- `artifactId` — never cleared (guard prevents reset when present)
- `validatedAt` — never cleared (guard prevents reset when artifact exists)
- All other stages' data — untouched

### stageStatus compatibility:
- The guard `!artifactId` implies `submitStageForValidation` hasn't been called → `stageStatus` is still `"drafting"`
- Auto-rescue (stageStatus → "revision") only triggers from `"pending_validation"` which requires prior `submitStageForValidation` which requires `artifactId` → guard would have blocked
- Therefore: `stageStatus` does NOT need resetting. It is always `"drafting"` when the reset fires.

### Deterministic vs probabilistic:
- The stageData reset is **deterministic** — code guarantees fields are cleared
- The model's subsequent behavior (presenting choice card, restarting discussion) is **probabilistic** — but with empty stageData, the model behaves consistently with a fresh stage start

### Observability:
- Convex log: `[PAPER][edit-resend-reset] stage=X cleared=[field1,field2,...]`
- Browser console: `[PAPER][edit-resend-reset] Client: stage=X cleared=N fields`

## E2E Audit Addition

Add to per-stage checklist:
- **12. Edit/resend on incomplete stage** — if user edits/resends any message while stage has no artifact, stageData should be cleared. Verify from: `[PAPER][edit-resend-reset]` in Convex logs. Model should start fresh (choice card for stages that use them, discussion restart for others).
