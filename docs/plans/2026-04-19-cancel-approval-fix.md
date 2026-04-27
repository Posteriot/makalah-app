# Cancel Approval Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make cancel approval functional, safe, and consistent with the existing cancel choice pattern.

**Architecture:** Backend-first approach. Fix `unapproveStage` mutation safety gaps (decisionEpoch, artifact invalidation) before relaxing frontend gates. Then replace the 30-second throttle with a confirmation dialog identical to cancel choice.

**Tech Stack:** Convex mutations (TypeScript), React (ChatWindow.tsx, MessageBubble.tsx), Radix Dialog

---

### Task 1: Fix `unapproveStage` — Add `decisionEpoch` Increment

**Why first:** Without epoch increment, cancelling approval while model is streaming in the new stage causes a race — in-flight operations won't self-abort. `cancelChoiceDecision` (line 799-801) already does this correctly.

**Files:**
- Modify: `convex/paperSessions.ts:930-938` (patch block in `unapproveStage`)

**Step 1: Add epoch increment before the patch block**

In `convex/paperSessions.ts`, find this block inside `unapproveStage` handler (line 930-938):

```typescript
// Build patch
const patchData: Record<string, unknown> = {
    currentStage: targetStage,
    stageStatus: "pending_validation",
    stageData: updatedStageData,
    paperMemoryDigest: updatedDigest,
    stageMessageBoundaries: updatedBoundaries,
    updatedAt: now,
};
```

Replace with:

```typescript
// Increment epoch (invalidates any in-flight chain-completion/rescue in new stage)
const currentEpoch = session.decisionEpoch ?? 0;
const newEpoch = currentEpoch + 1;

// Build patch
const patchData: Record<string, unknown> = {
    currentStage: targetStage,
    stageStatus: "pending_validation",
    stageData: updatedStageData,
    paperMemoryDigest: updatedDigest,
    stageMessageBoundaries: updatedBoundaries,
    decisionEpoch: newEpoch,
    updatedAt: now,
};
```

**Step 2: Update the log line to include epoch**

Find line 953:
```typescript
console.info(`[PAPER][unapprove] stage=${targetStage} clearedNextStage=${clearedNextStage}`);
```

Replace with:
```typescript
console.info(`[PAPER][unapprove] stage=${targetStage} clearedNextStage=${clearedNextStage} epoch=${newEpoch}`);
```

**Step 3: Verify Convex compiles**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness && npx convex dev --once`
Expected: No type errors, mutation compiles.

**Step 4: Commit**

```bash
git add convex/paperSessions.ts
git commit -m "fix(cancel-approval): add decisionEpoch increment to unapproveStage

Race condition: model streaming in new stage was not invalidated on
approval cancel because unapproveStage did not increment decisionEpoch.
cancelChoiceDecision already does this (line 799-801)."
```

---

### Task 2: Fix `unapproveStage` — Invalidate Artifacts in Next Stage

**Why:** When user cancels approval after new stage already created an artifact, that artifact becomes orphaned — still "valid" in DB but unreferenced. `cancelChoiceDecision` (line 806-818) handles this with `invalidatedAt`.

**Files:**
- Modify: `convex/paperSessions.ts:885-888` (clear next stage data section in `unapproveStage`)

**Step 1: Add artifact invalidation before clearing next stage data**

Find this block (line 885-888):
```typescript
// 2. Clear nextStageToClear stageData (may have _plan or draft fields)
if (nextStageToClear !== "completed" && updatedStageData[nextStageToClear]) {
    updatedStageData[nextStageToClear] = {};
}
```

Replace with:
```typescript
// 2. Invalidate artifact in nextStageToClear (if any), then clear stageData
let nextStageArtifactInvalidated = false;
if (nextStageToClear !== "completed" && updatedStageData[nextStageToClear]) {
    const nextStageData = updatedStageData[nextStageToClear];
    const nextArtifactId = nextStageData.artifactId as string | undefined;
    if (nextArtifactId) {
        try {
            await ctx.db.patch(nextArtifactId as Id<"artifacts">, {
                invalidatedAt: now,
            });
            nextStageArtifactInvalidated = true;
        } catch {
            console.warn(`[PAPER][unapprove] next-stage artifact invalidation failed id=${nextArtifactId}`);
        }
    }
    updatedStageData[nextStageToClear] = {};
}
```

**Step 2: Update the log line to include artifact info**

Update the log line (already modified in Task 1):
```typescript
console.info(`[PAPER][unapprove] stage=${targetStage} clearedNextStage=${clearedNextStage} nextStageArtifactInvalidated=${nextStageArtifactInvalidated} epoch=${newEpoch}`);
```

**Step 3: Verify Convex compiles**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness && npx convex dev --once`
Expected: No type errors, mutation compiles.

**Step 4: Commit**

```bash
git add convex/paperSessions.ts
git commit -m "fix(cancel-approval): invalidate next-stage artifacts in unapproveStage

When approval is cancelled after the new stage already created an
artifact, that artifact was orphaned in DB. Now sets invalidatedAt
(soft-delete), matching cancelChoiceDecision pattern (line 806-818)."
```

---

### Task 3: Relax `cancelableApprovalMessageId` Gate

**Why:** Current gate requires `stageStatus === "drafting"` (normal) or `completed + approved` (final). After approval, stageStatus transitions through `"approved"` → stage advance → new stage `"drafting"`. The `"drafting"` condition matches... but for the WRONG stage. We need to also match when `stageStatus === "approved"` and the stage hasn't advanced yet.

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx:1855-1869` (`cancelableApprovalMessageId` useMemo)

**Step 1: Expand the gate condition**

Find this block (line 1855-1869):
```typescript
const cancelableApprovalMessageId = useMemo(() => {
    if (!paperSession) return null
    const isNormalApproval = paperSession.stageStatus === "drafting"
    const isFinalApproval = paperSession.currentStage === "completed" && paperSession.stageStatus === "approved"
    if (!isNormalApproval && !isFinalApproval) return null
    // Find the latest [Approved:] — by construction this is the one for the current previous stage
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.role !== "user") continue
      const textPart = msg.parts?.find((p) => p.type === "text") as { text?: string } | undefined
      const text = textPart?.text ?? ""
      if (text.startsWith("[Approved:")) return msg.id
    }
    return null
  }, [messages, paperSession])
```

Replace with:
```typescript
const cancelableApprovalMessageId = useMemo(() => {
    if (!paperSession) return null
    // Allow cancel when:
    // 1. Normal post-approval: stage advanced, new stage is "drafting"
    // 2. Mid-transition: current stage still "approved" (before advance completes)
    // 3. Final approval: paper completed
    const isNormalApproval = paperSession.stageStatus === "drafting"
    const isMidTransition = paperSession.stageStatus === "approved" && paperSession.currentStage !== "completed"
    const isFinalApproval = paperSession.currentStage === "completed" && paperSession.stageStatus === "approved"
    if (!isNormalApproval && !isMidTransition && !isFinalApproval) return null
    // Find the latest [Approved:] — by construction this is the one for the current previous stage
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.role !== "user") continue
      const textPart = msg.parts?.find((p) => p.type === "text") as { text?: string } | undefined
      const text = textPart?.text ?? ""
      if (text.startsWith("[Approved:")) return msg.id
    }
    return null
  }, [messages, paperSession])
```

**Step 2: Verify TypeScript compiles**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness && npx next build --no-lint 2>&1 | head -20`
Expected: No type errors in ChatWindow.tsx.

**Step 3: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "fix(cancel-approval): relax cancelableApprovalMessageId gate

Add isMidTransition condition (stageStatus=approved, not completed)
so cancel button is visible during the approval→advance transition
window, not just after stage has fully advanced to drafting."
```

---

### Task 4: Replace 30s Throttle with Confirmation Dialog

**Why:** The 30s throttle and the gate condition contradict each other — gate needs fast timing, throttle enforces 30s delay. Replace with confirmation dialog (same pattern as cancel choice at MessageBubble.tsx:1223-1258).

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx:1263-1301` (approval cancel section)

**Step 1: Add dialog state**

Find the existing `showCancelConfirm` state (line 224):
```typescript
const [showCancelConfirm, setShowCancelConfirm] = useState(false)
```

Add a new state right after it:
```typescript
const [showApprovalCancelConfirm, setShowApprovalCancelConfirm] = useState(false)
```

**Step 2: Replace the throttled approval cancel block**

Find this block (line 1263-1301):
```typescript
            // Cancel Decision: Batalkan button for approved synthetic messages
            if (autoAction?.kind === "approved" && onCancelApproval && message.id === cancelableApprovalMessageId) {
                // 30-second throttle via allMessages[messageIndex].createdAt (design doc 5.5.3)
                const messageCreatedAt = allMessages[messageIndex]?.createdAt ?? 0
                const messageAge = messageCreatedAt ? Date.now() - messageCreatedAt : 0
                const throttled = !messageCreatedAt || messageAge < 30_000
                const cancelAllowed = !isStreaming && !throttled
                return (
                <div className="flex flex-col items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity pt-2">
                    {cancelAllowed ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => onCancelApproval(message.id, messageIndex)}
                                    className={actionBtnClass}
                                    style={{ color: "var(--chat-warning-foreground, var(--chat-muted-foreground))" }}
                                    aria-label="Batalkan persetujuan"
                                >
                                    <Undo className={actionIconClass} strokeWidth={2} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Batalkan</TooltipContent>
                        </Tooltip>
                    ) : null}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={handleCopyUserMessage}
                                className={actionBtnClass}
                                style={isCopied ? copiedBtnStyle : actionBtnStyle}
                                aria-label="Copy message"
                            >
                                {isCopied ? <Check className={actionIconClass} strokeWidth={2} /> : <Copy className={actionIconClass} strokeWidth={2} />}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="left">{isCopied ? "Copied" : "Copy"}</TooltipContent>
                    </Tooltip>
                </div>
                )
            }
```

Replace with:
```typescript
            // Cancel Decision: Batalkan button for approved synthetic messages
            if (autoAction?.kind === "approved" && onCancelApproval && message.id === cancelableApprovalMessageId) {
                const cancelAllowed = !isStreaming
                return (
                <>
                <div className="flex flex-col items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity pt-2">
                    {cancelAllowed ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => setShowApprovalCancelConfirm(true)}
                                    className={actionBtnClass}
                                    style={{ color: "var(--chat-muted-foreground)" }}
                                    aria-label="Batalkan persetujuan"
                                >
                                    <Undo className={actionIconClass} strokeWidth={2} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Batalkan</TooltipContent>
                        </Tooltip>
                    ) : null}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={handleCopyUserMessage}
                                className={actionBtnClass}
                                style={isCopied ? copiedBtnStyle : actionBtnStyle}
                                aria-label="Copy message"
                            >
                                {isCopied ? <Check className={actionIconClass} strokeWidth={2} /> : <Copy className={actionIconClass} strokeWidth={2} />}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="left">{isCopied ? "Copied" : "Copy"}</TooltipContent>
                    </Tooltip>
                </div>
                <Dialog open={showApprovalCancelConfirm} onOpenChange={setShowApprovalCancelConfirm}>
                    <DialogContent
                        data-chat-scope=""
                        showCloseButton={false}
                        className="bg-[var(--chat-card)] border-[color:var(--chat-border)] rounded-lg max-w-md"
                    >
                        <DialogHeader>
                            <DialogTitle className="text-sm font-semibold text-[var(--chat-foreground)]">
                                Batalkan Persetujuan?
                            </DialogTitle>
                            <DialogDescription className="text-xs text-[var(--chat-muted-foreground)]">
                                Stage akan kembali ke validasi. Semua progres di stage berikutnya akan hilang. Tindakan ini tidak dapat dikembalikan.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="flex gap-2 sm:justify-center">
                            <DialogClose
                                className={cn(
                                    "gap-2 h-9 px-4 rounded-action inline-flex items-center justify-center",
                                    "chat-validation-approve-button"
                                )}
                            >
                                Kembali
                            </DialogClose>
                            <button
                                onClick={() => { setShowApprovalCancelConfirm(false); onCancelApproval(message.id, messageIndex) }}
                                className={cn(
                                    "gap-2 h-9 px-4 rounded-action inline-flex items-center justify-center text-sm font-medium",
                                    "border border-[color:var(--chat-border)] text-[var(--chat-secondary-foreground)]",
                                    "bg-[var(--chat-card)] hover:bg-[var(--chat-accent)] hover:border-[color:var(--chat-primary)]"
                                )}
                            >
                                Batalkan Persetujuan
                            </button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                </>
                )
            }
```

**Key changes:**
- Removed 30s throttle — `cancelAllowed` is now just `!isStreaming`
- Button opens dialog instead of calling `onCancelApproval` directly
- Dialog cloned from choice cancel (line 1223-1258) with approval-specific text
- Icon color fixed: `var(--chat-muted-foreground)` (no more `--chat-warning-foreground` fallback)

**Step 3: Verify Dialog/DialogClose imports already exist**

The imports at line 22-29 already include all needed Dialog components. No import changes needed.

**Step 4: Verify TypeScript compiles**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness && npx next build --no-lint 2>&1 | head -20`
Expected: No type errors.

**Step 5: Commit**

```bash
git add src/components/chat/MessageBubble.tsx
git commit -m "fix(cancel-approval): replace 30s throttle with confirmation dialog

The 30s throttle contradicted the gate condition — gate needed fast
timing, throttle enforced delay. Now uses Dialog pattern matching
cancel choice (line 1223-1258). Also fixes icon color for light mode
(--chat-muted-foreground instead of --chat-warning-foreground)."
```

---

### Task 5: Manual Verification

**Step 1: Test approve → cancel approval → verify stage reverts**

1. Start a paper session, complete stage 1 (gagasan)
2. Validation panel appears → click "Setuju & Lanjutkan"
3. `[Approved:]` bubble appears with undo icon visible (no 30s wait)
4. Click undo icon → confirmation dialog appears with text "Batalkan Persetujuan?"
5. Click "Batalkan Persetujuan" → stage reverts to validation panel
6. Verify: `stageStatus` is `"pending_validation"`, `currentStage` is back to previous stage

**Step 2: Test cancel during model streaming**

1. Approve a stage
2. While model is streaming response for new stage, check that undo icon is hidden (cancelAllowed = false when isStreaming)
3. Wait for streaming to finish → undo icon appears
4. Cancel → verify no orphan data from new stage

**Step 3: Test light mode icon visibility**

1. Switch to light mode
2. Verify cancel approval undo icon is visible (not white-on-white)

**Step 4: Test dialog dismiss behaviors**

1. Open cancel approval dialog → click "Kembali" → dialog closes, no action
2. Open cancel approval dialog → click outside → dialog closes, no action
3. Open cancel approval dialog → press Escape → dialog closes, no action
