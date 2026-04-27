# Edit/Resend on Validation Panel Decision — Implementation Plan

**Goal:** When user edits/resends during a stage that has an artifact (pending_validation) or has been approved (stage advanced), reset the stage to a clean state so model starts fresh.

**Execution:** After E2E test completes. Not blocking E2E test.

**Design doc:** `design.md` in this directory.

---

## Scenario A: Artifact Exists, Stage NOT Approved

### Task A1: Expand `resetStageDataForEditResend` Mutation

**File:** `convex/paperSessions.ts` — modify existing `resetStageDataForEditResend`

**Step 1: Remove `artifactId` guard**

Replace:
```typescript
// Guard: only reset if has data but no artifact (incomplete stage)
if (!currentStageData || currentStageData.artifactId) {
    return {
        reset: false,
        reason: currentStageData?.artifactId ? "has_artifact" : "no_data",
    };
}
```

With:
```typescript
// Guard: only skip if truly empty
if (!currentStageData) {
    return { reset: false, reason: "no_data" };
}
```

**Step 2: Add artifact invalidation**

After the guard, before clearing stageData:

```typescript
// Invalidate existing artifact if present
const artifactId = currentStageData.artifactId as string | undefined;
if (artifactId) {
    try {
        await ctx.db.patch(artifactId as Id<"artifacts">, {
            invalidatedAt: Date.now(),
            invalidatedByEditResend: true,
        });
        console.info(`[PAPER][edit-resend-reset] artifact invalidated: ${artifactId}`);
    } catch (err) {
        // Artifact may not exist (deleted separately) — non-fatal
        console.warn(`[PAPER][edit-resend-reset] artifact invalidation failed: ${artifactId}`, err);
    }
}
```

**Step 3: Reset stageStatus if pending_validation**

Add to the `ctx.db.patch` call:

```typescript
await ctx.db.patch(args.sessionId, {
    stageData: updatedStageData,
    // Reset stageStatus if it was pending_validation (no longer valid after reset)
    ...(session.stageStatus === "pending_validation" ? { stageStatus: "drafting" } : {}),
    updatedAt: Date.now(),
});
```

**Step 4: Update log to include artifact info**

```typescript
console.info(
    `[PAPER][edit-resend-reset] stage=${currentStage} cleared=[${clearedFields.join(",")}]` +
    `${artifactId ? ` artifact=${artifactId} invalidated=true` : ""}` +
    `${session.stageStatus === "pending_validation" ? " stageStatus=drafting (reset from pending_validation)" : ""}`
);
```

**Step 5: Update return value**

```typescript
return {
    reset: true,
    stage: currentStage,
    clearedFields,
    artifactInvalidated: !!artifactId,
    stageStatusReset: session.stageStatus === "pending_validation",
};
```

### Task A2: Update ChatWindow.tsx Client Guard

**File:** `src/components/chat/ChatWindow.tsx` — modify existing guard in `handleEdit`

Remove the `!currentStageData.artifactId` client-side pre-check:

```typescript
// BEFORE:
if (currentStageData && !currentStageData.artifactId) {

// AFTER:
if (currentStageData) {
```

The server-side mutation handles all cases now. Client guard only checks "has any stageData".

### Task A3: Verify Schema Compatibility

Check `convex/schema.ts` for the `artifacts` table:
- Does it have `invalidatedAt: v.optional(v.number())`? (Should — rewind already uses it)
- Does it have `invalidatedByEditResend: v.optional(v.boolean())`? (Likely not — need to add)

If `invalidatedByEditResend` doesn't exist in schema, either:
- Add it to schema (preferred — explicit tracking)
- Or skip it and only use `invalidatedAt` (sufficient for invalidation, less auditable)

### Task A4: Deploy and Type Check

```bash
npx tsc --noEmit
npx convex dev --once
```

### Task A5: Commit

```bash
git commit -m "feat: expand edit/resend reset to handle artifacts + pending_validation"
```

---

## Scenario B: Stage Approved, Auto-Rewind

### Task B1: Add Confirmation Dialog for Approval Edit

**File:** `src/components/chat/ChatWindow.tsx` — modify `handleEdit`

After `editAndTruncate` and before `sendUserMessageWithContext`, detect the approval-edit case:

```typescript
// Detect: stage has advanced beyond what message history covers
// currentStage = N+1, previous stage (N) has validatedAt
if (isPaperMode && paperSession) {
    const currentStage = paperSession.currentStage as string;
    const prevStage = getPreviousStage(currentStage as PaperStageId);

    if (prevStage) {
        const prevStageData = stageData?.[prevStage];
        const currentStageEmpty = !stageData?.[currentStage] ||
            Object.keys(stageData[currentStage] ?? {}).filter(k => k !== "revisionCount").length === 0;

        if (prevStageData?.validatedAt && currentStageEmpty) {
            // Approval was truncated — need to rewind
            const confirmed = await showRewindConfirmation(prevStage);
            if (!confirmed) return; // Abort edit/resend

            // Rewind to previous stage
            await rewindToStage(userId, prevStage as PaperStageId);

            // Then reset stageData for that stage
            await resetStageDataForEditResendMutation({
                sessionId: paperSession._id,
                userId,
            });
        }
    }
}
```

**Note:** `showRewindConfirmation` is a new function that shows a confirmation dialog. Could reuse `RewindConfirmationDialog` or a simpler `window.confirm`-style dialog.

### Task B2: Import `getPreviousStage` Helper

`getPreviousStage` exists in `convex/paperSessions/constants.ts`. Import it in ChatWindow.tsx.

### Task B3: Handle Multi-Stage Edit Edge Case

If user edits a message from stage N-2 while at stage N+1, simple 1-stage rewind isn't enough. Options:

- Check how many stages back the edit goes (compare message timestamps with validatedAt boundaries)
- Only auto-rewind 1 stage. For deeper edits, show: "Gunakan timeline untuk kembali ke tahap yang diinginkan."

### Task B4: Deploy, Type Check, Commit

```bash
npx tsc --noEmit
npx convex dev --once
git commit -m "feat: auto-rewind on approval edit/resend with confirmation dialog"
```

---

## Observability

### Existing (from choice card fix)
- Terminal: `[PAPER][session-resolve] ... postEditResendReset=true`
- Convex: `[PAPER][edit-resend-reset] stage=X cleared=[...]`
- Browser: `[PAPER][edit-resend-reset] Client: stage=X cleared=N fields`

### New (Scenario A additions)
- Convex: `[PAPER][edit-resend-reset] ... artifact=X invalidated=true`
- Convex: `[PAPER][edit-resend-reset] ... stageStatus=drafting (reset from pending_validation)`

### New (Scenario B additions)
- Browser: `[PAPER][edit-resend-rewind] stage=N confirmed=true/false`
- Convex: `[PAPER][rewind]` (existing rewind log) + `[PAPER][edit-resend-reset]`

## E2E Audit Checklist Addition

Update `screenshots/test-stages/review-audit-checklist.md`:

```
G. Edit/Resend stageData Reset (expanded)

12a. Edit/resend on incomplete stage (no artifact) — stageData cleared, model starts fresh.
     Verify: [PAPER][edit-resend-reset] in Convex logs, no artifactInvalidated.

12b. Edit/resend on pending_validation stage (artifact exists) — stageData cleared,
     artifact invalidated, stageStatus reset to drafting. Model regenerates artifact.
     Verify: [PAPER][edit-resend-reset] ... artifact=X invalidated=true stageStatus=drafting

12c. Edit/resend on approved stage (stage advanced) — auto-rewind triggered with
     confirmation dialog, then stageData cleared + artifact invalidated.
     Verify: [PAPER][edit-resend-rewind] + [PAPER][rewind] + [PAPER][edit-resend-reset]
```

---

## Dependency Graph

```
Task A1 (expand mutation) → Task A2 (update client guard) → Task A3 (schema check) → Task A4 (deploy) → Task A5 (commit)
                                                                                        ↓
Task B1 (confirmation dialog) → Task B2 (import helper) → Task B3 (multi-stage edge) → Task B4 (deploy + commit)
```

Scenario A is independent. Scenario B depends on A being done first (the reset mutation must handle artifacts before the rewind+reset sequence works).
