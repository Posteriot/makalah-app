# Phase 2 Review — Cancel Approval + Harness Run Guard

**Date:** 2026-04-17
**Branch:** `agent-harness`
**Commits:** `0a50e3b1`, `daf7b998`
**Reviewer:** Claude (internal), pending Codex audit

---

## Commits

| Hash | Message |
|------|---------|
| `0a50e3b1` | `feat(cancel-decision): add unapproveStage mutation + titleStrippedOnApproval flag` |
| `daf7b998` | `feat(cancel-decision): add handleCancelApproval handler + Batalkan button for approved messages` |

---

## Files Modified

| File | Lines Changed | Summary |
|------|---------------|---------|
| `convex/paperSessions.ts` | +124 / -1 | `unapproveStage` mutation (117 lines), `titleStrippedOnApproval` flag (4 lines), `getPreviousStage` import (1 line) |
| `src/components/chat/ChatWindow.tsx` | +34 | Wire `unapproveStage` mutation, `handleCancelApproval` handler, pass `onCancelApproval` prop |
| `src/components/chat/MessageBubble.tsx` | +43 | `onCancelApproval` prop, Batalkan button for `kind: "approved"` with 30s throttle |

**Total:** 3 files, +201 / -1

---

## Design Doc Compliance

### Task 2.1: `titleStrippedOnApproval` flag (Section 5.2)

| Check | Verdict |
|-------|---------|
| Flag stored only when regex matches AND `finalTitle` is non-empty | **PASS** — inside `if (finalTitle)` block at line 1467 |
| Flag uses `updatedStageData[currentStage]` (existing object) | **PASS** — spread preserves existing `validatedAt` |
| No new schema field needed (stored in stageData) | **PASS** |

### Task 2.2: `unapproveStage` mutation (Section 5.2)

| Check | Verdict |
|-------|---------|
| Guard: normal approval (`stageStatus === "drafting"`) | **PASS** — line 853 |
| Guard: final approval (`completed + approved`) | **PASS** — line 854 |
| targetStage derivation: `getPreviousStage` for normal | **PASS** — line 865 |
| targetStage derivation: last `STAGE_ORDER` entry for completed | **PASS** ��� line 863 |
| Guard: targetStage has `validatedAt` | **PASS** — lines 872-874 |
| `nextStageToClear` saved BEFORE revert | **PASS** — line 878 (before `updatedStageData` mutation) |
| Remove `validatedAt` from targetStage | **PASS** — line 882 (destructured out) |
| Clear `stageData[nextStageToClear]` | **PASS** — lines 886-888 (not `completed`) |
| Digest: `superseded` pattern (not delete) | **PASS** — lines 894-900 |
| Boundaries: remove last entry (not supersede) | **PASS** — lines 907-911, stage match verified |
| Title re-prefix: only when `titleStrippedOnApproval` | **PASS** — line 915 checks flag |
| Title re-prefix: skip if already has "Draf" prefix | **PASS** — line 918 regex check |
| judul special: clear `paperTitle`, `workingTitle`, `completedAt` | **PASS** — lines 939-942 |
| `rebuildNaskahSnapshot` called | **PASS** — line 948 |
| `requirePaperSessionOwner` used | **PASS** — line 849 |
| Logging follows `[PAPER][unapprove]` pattern | **PASS** — line 951 |

### Task 2.3: `handleCancelApproval` + UI (Sections 4.3, 5.5.3)

| Check | Verdict |
|-------|---------|
| No AI turn triggered (just state revert + message delete) | **PASS** — handler only calls `unapproveStage` + `editAndTruncate` + `setMessages` |
| UIMessage.id → Convex._id mapping via `historyMessages` | **PASS** — same pattern as `handleCancelChoice` |
| `editAndTruncate` uses `content: ""` | **PASS** — line 2425 |
| Local messages truncated | **PASS** — line 2430 |
| Sentry error capture | **PASS** — line 2437 |
| 30-second throttle uses `allMessages[messageIndex]?.createdAt` | **PASS** — line 1212 |
| Default hide when `createdAt` absent | **PASS** — `!messageCreatedAt` → `throttled = true` → hidden |
| Streaming guard | **PASS** — `!isStreaming` at line 1215 |
| Icon: `Undo` from `iconoir-react` (not lucide) | **PASS** — line 1227 |
| `onCancelApproval` prop wired from ChatWindow | **PASS** ��� line 2869 |
| No unused imports | **PASS** |

---

## Issues Found

**0 blockers. 0 issues.**

### Minor Observations (Non-blocking)

1. **30-second throttle is UX heuristic, not correctness guarantee** — Documented in design doc 5.5.3. Harness runs exceeding 30s are unguarded in V1. Acceptable per design decision.

2. **`createdAt` source adaptation** — Plan specified `message.createdAt` (UIMessage), but UIMessage from AI SDK has no `createdAt` field. Implementation correctly uses `allMessages[messageIndex]?.createdAt` (Convex PermissionMessage). This is consistent with existing codebase pattern.

3. **`getPreviousStage` import was missing** — Was not imported in `paperSessions.ts` despite being used by other functions in the same module. Agent correctly added it to the existing import statement.

---

## TypeScript Verification

```
$ npx tsc --noEmit
(zero errors)
```

---

## Full Diff

```diff
diff --git a/convex/paperSessions.ts b/convex/paperSessions.ts
index a1cee847..c129ab90 100644
--- a/convex/paperSessions.ts
+++ b/convex/paperSessions.ts
@@ -1,7 +1,7 @@
 import { v } from "convex/values";
 import { mutation, query } from "./_generated/server";
 import { Id } from "./_generated/dataModel";
-import { getNextStage, PaperStageId, STAGE_ORDER } from "./paperSessions/constants";
+import { getNextStage, getPreviousStage, PaperStageId, STAGE_ORDER } from "./paperSessions/constants";
 import {
     requireAuthUser,
     requireAuthUserId,
@@ -835,6 +835,124 @@ export const cancelChoiceDecision = mutation({
     },
 });
 
+/**
+ * Unapprove a stage — revert the last approval decision.
+ * Only allowed in valid post-approval states.
+ * Ref: design doc section 5.2
+ */
+export const unapproveStage = mutation({
+    args: {
+        sessionId: v.id("paperSessions"),
+        userId: v.id("users"),
+    },
+    handler: async (ctx, args) => {
+        const { session } = await requirePaperSessionOwner(ctx, args.sessionId);
+        const now = Date.now();
+
+        // Guard: valid post-approval state
+        const isNormalApproval = session.stageStatus === "drafting";
+        const isFinalApproval = session.currentStage === "completed" && session.stageStatus === "approved";
+        if (!isNormalApproval && !isFinalApproval) {
+            throw new Error(`Cannot unapprove: stageStatus="${session.stageStatus}", currentStage="${session.currentStage}"`);
+        }
+
+        // Derive targetStage
+        let targetStage: PaperStageId;
+        if (isFinalApproval) {
+            // completed → last STAGE_ORDER entry ("judul")
+            targetStage = STAGE_ORDER[STAGE_ORDER.length - 1];
+        } else {
+            const prev = getPreviousStage(session.currentStage as PaperStageId);
+            if (!prev) throw new Error(`Cannot unapprove: no previous stage for "${session.currentStage}"`);
+            targetStage = prev;
+        }
+
+        // Guard: target stage must have validatedAt
+        const stageData = session.stageData as Record<string, Record<string, unknown>>;
+        const targetStageData = stageData[targetStage];
+        if (!targetStageData?.validatedAt) {
+            throw new Error(`Cannot unapprove: stage "${targetStage}" has no validatedAt`);
+        }
+
+        // Save nextStageToClear BEFORE revert
+        const nextStageToClear = session.currentStage;
+
+        // 1. Remove validatedAt from targetStage stageData
+        const updatedStageData = { ...stageData };
+        const { validatedAt: _, ...targetStageWithoutValidated } = targetStageData;
+        updatedStageData[targetStage] = targetStageWithoutValidated;
+
+        // 2. Clear nextStageToClear stageData (may have _plan or draft fields)
+        if (nextStageToClear !== "completed" && updatedStageData[nextStageToClear]) {
+            updatedStageData[nextStageToClear] = {};
+        }
+
+        // 3. Mark last digest entry as superseded
+        const existingDigest = (session.paperMemoryDigest as Array<{
+            stage: string; decision: string; timestamp: number; superseded?: boolean;
+        }>) || [];
+        const updatedDigest = [...existingDigest];
+        for (let i = updatedDigest.length - 1; i >= 0; i--) {
+            if (updatedDigest[i].stage === targetStage && !updatedDigest[i].superseded) {
+                updatedDigest[i] = { ...updatedDigest[i], superseded: true };
+                break;
+            }
+        }
+
+        // 4. Remove last stageMessageBoundaries entry (verify stage matches)
+        const existingBoundaries = (session.stageMessageBoundaries as Array<{
+            stage: string; firstMessageId: string; lastMessageId: string; messageCount: number;
+        }>) || [];
+        let updatedBoundaries = existingBoundaries;
+        if (existingBoundaries.length > 0) {
+            const lastBoundary = existingBoundaries[existingBoundaries.length - 1];
+            if (lastBoundary.stage === targetStage) {
+                updatedBoundaries = existingBoundaries.slice(0, -1);
+            }
+        }
+
+        // 5. Re-add "Draf " prefix to artifact title if stripped on approval
+        if (targetStageData.titleStrippedOnApproval && targetStageData.artifactId) {
+            try {
+                const artifact = await ctx.db.get(targetStageData.artifactId as Id<"artifacts">);
+                if (artifact && artifact.title && !/^draf(?:t)?\b/i.test(artifact.title)) {
+                    await ctx.db.patch(targetStageData.artifactId as Id<"artifacts">, {
+                        title: `Draf ${artifact.title}`,
+                    });
+                }
+            } catch {
+                console.warn(`[PAPER][unapprove] artifact title re-prefix failed`);
+            }
+        }
+
+        // Build patch
+        const patchData: Record<string, unknown> = {
+            currentStage: targetStage,
+            stageStatus: "pending_validation",
+            stageData: updatedStageData,
+            paperMemoryDigest: updatedDigest,
+            stageMessageBoundaries: updatedBoundaries,
+            updatedAt: now,
+        };
+
+        // 6. If targetStage === "judul": clear paperTitle, workingTitle, completedAt
+        if (targetStage === "judul") {
+            patchData.paperTitle = undefined;
+            patchData.workingTitle = undefined;
+            patchData.completedAt = undefined;
+        }
+
+        await ctx.db.patch(args.sessionId, patchData);
+
+        // 7. Rebuild naskahSnapshot
+        await rebuildNaskahSnapshot(ctx, args.sessionId);
+
+        const clearedNextStage = nextStageToClear !== "completed" && !!stageData[nextStageToClear];
+        console.info(`[PAPER][unapprove] stage=${targetStage} clearedNextStage=${clearedNextStage}`);
+        return { targetStage, clearedNextStage };
+    },
+});
+
 /**
  * Update data for the current stage.
  */
@@ -1346,6 +1464,11 @@ export const approveStage = mutation({
                 if (finalTitle) {
                     await ctx.db.patch(stageArtifactId as Id<"artifacts">, { title: finalTitle });
                     decisionText = finalTitle;
+                    // Cancel Decision: record that we stripped the prefix for unapproveStage reversal
+                    updatedStageData[currentStage] = {
+                        ...updatedStageData[currentStage],
+                        titleStrippedOnApproval: true,
+                    };
                 }
             }
         } else {
diff --git a/src/components/chat/ChatWindow.tsx b/src/components/chat/ChatWindow.tsx
index 3aaee6df..6c24f3da 100644
--- a/src/components/chat/ChatWindow.tsx
+++ b/src/components/chat/ChatWindow.tsx
@@ -887,6 +887,7 @@ export function ChatWindow({
   const editAndTruncate = useMutation(api.messages.editAndTruncateConversation)
   const resetStageDataForEditResendMutation = useMutation(api.paperSessions.resetStageDataForEditResend)
   const cancelChoiceDecision = useMutation(api.paperSessions.cancelChoiceDecision)
+  const unapproveStage = useMutation(api.paperSessions.unapproveStage)
 
   // Refs to always read latest attachment state at request time (bypasses useChat stale transport bug)
   const attachedFilesRef = useRef(attachedFiles)
@@ -2409,6 +2410,38 @@ export function ChatWindow({
     }
   }, [userId, paperSession?._id, conversationId, historyMessages, cancelChoiceDecision, editAndTruncate, setMessages])
 
+  const handleCancelApproval = useCallback(async (uiMessageId: string, syntheticMessageIndex: number) => {
+    if (!userId || !paperSession?._id || !conversationId) return
+    try {
+      // 1. Revert Convex state
+      await unapproveStage({ sessionId: paperSession._id, userId })
+
+      // 2. Map UIMessage.id → Convex message._id for truncation
+      const convexMsg = historyMessages?.find(
+        (m) => m.uiMessageId === uiMessageId || String(m._id) === uiMessageId
+      )
+      if (convexMsg) {
+        await editAndTruncate({
+          messageId: convexMsg._id as Id<"messages">,
+          content: "",
+          conversationId: conversationId as Id<"conversations">,
+        })
+      }
+
+      // 3. Truncate local messages (UIMessage state)
+      setMessages((prev) => prev.slice(0, syntheticMessageIndex))
+
+      // 4. Validation panel auto-reappears via Convex reactivity
+      // (stageStatus = "pending_validation" triggers panel render)
+
+      console.info("[CANCEL-DECISION] approval cancelled, validation panel re-shown")
+    } catch (error) {
+      Sentry.captureException(error, { tags: { subsystem: "paper.cancel-approval" } })
+      console.error("Failed to cancel approval:", error)
+      toast.error("Gagal membatalkan persetujuan.")
+    }
+  }, [userId, paperSession?._id, conversationId, historyMessages, unapproveStage, editAndTruncate, setMessages])
+
   // Handler for template selection
   const handleTemplateSelect = (template: Template) => {
     if (isLoading) return
@@ -2833,6 +2866,7 @@ export function ChatWindow({
                         isChoiceSubmitted={submittedChoiceKeys.has(`${message.id}::${message.id}-choice-spec`)}
                         onChoiceSubmit={handleChoiceSubmit}
                         onCancelChoice={handleCancelChoice}
+                        onCancelApproval={handleCancelApproval}
                         isStreaming={status === "streaming"}
                       />
                     </div>
diff --git a/src/components/chat/MessageBubble.tsx b/src/components/chat/MessageBubble.tsx
index 84c71615..8a797a0c 100644
--- a/src/components/chat/MessageBubble.tsx
+++ b/src/components/chat/MessageBubble.tsx
@@ -178,6 +178,7 @@ interface MessageBubbleProps {
         customText?: string
     }) => void | Promise<void>
     onCancelChoice?: (messageId: string, messageIndex: number) => void
+    onCancelApproval?: (messageId: string, messageIndex: number) => void
     isStreaming?: boolean
 }
 
@@ -199,6 +200,7 @@ export function MessageBubble({
     isChoiceSubmitted,
     onChoiceSubmit,
     onCancelChoice,
+    onCancelApproval,
     isStreaming,
 }: MessageBubbleProps) {
     const [isEditing, setIsEditing] = useState(false)
@@ -1204,6 +1206,47 @@ export function MessageBubble({
                     )
                 }
 
+                // Cancel Decision: Batalkan button for approved synthetic messages
+                if (autoAction?.kind === "approved" && onCancelApproval) {
+                    // 30-second throttle via allMessages[messageIndex].createdAt (design doc 5.5.3)
+                    const messageCreatedAt = allMessages[messageIndex]?.createdAt ?? 0
+                    const messageAge = messageCreatedAt ? Date.now() - messageCreatedAt : 0
+                    const throttled = !messageCreatedAt || messageAge < 30_000
+                    const cancelAllowed = !isStreaming && !throttled
+                    return (
+                    <div className="flex flex-col items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity pt-2">
+                        {cancelAllowed ? (
+                            <Tooltip>
+                                <TooltipTrigger asChild>
+                                    <button
+                                        onClick={() => onCancelApproval(message.id, messageIndex)}
+                                        className={actionBtnClass}
+                                        style={{ color: "var(--chat-warning-foreground, var(--chat-muted-foreground))" }}
+                                        aria-label="Batalkan persetujuan"
+                                    >
+                                        <Undo className={actionIconClass} strokeWidth={2} />
+                                    </button>
+                                </TooltipTrigger>
+                                <TooltipContent side="left">Batalkan</TooltipContent>
+                            </Tooltip>
+                        ) : null}
+                        <Tooltip>
+                            <TooltipTrigger asChild>
+                                <button
+                                    onClick={handleCopyUserMessage}
+                                    className={actionBtnClass}
+                                    style={isCopied ? copiedBtnStyle : actionBtnStyle}
+                                    aria-label="Copy message"
+                                >
+                                    {isCopied ? <Check className={actionIconClass} strokeWidth={2} /> : <Copy className={actionIconClass} strokeWidth={2} />}
+                                </button>
+                            </TooltipTrigger>
+                            <TooltipContent side="left">{isCopied ? "Copied" : "Copy"}</TooltipContent>
+                        </Tooltip>
+                    </div>
+                    )
+                }
+
                 return (
                 <div className="flex flex-col items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity pt-2">
                     {onEdit && (
```

---

## Codex Audit Prompt

Codex, review Phase 2 of the "Cancel Decision" feature against `docs/cancel-decision/design.md` sections 4.3, 5.2, and 5.5.3.

**Focus areas:**

1. **`unapproveStage` correctness** — Is the mutation a complete reverse of `approveStage`? Check: `nextStageToClear` timing, digest `superseded` pattern, boundary removal with stage match, `titleStrippedOnApproval` flag roundtrip, judul special case (paperTitle/workingTitle/completedAt), naskahSnapshot rebuild.

2. **Guard completeness** — Two valid post-approval states: `stageStatus === "drafting"` (normal) AND `currentStage === "completed" && stageStatus === "approved"` (final). Are edge cases like `gagasan` (no previous stage) handled?

3. **`handleCancelApproval` handler** — Does it avoid triggering an AI turn? Is the UIMessage.id → Convex._id mapping correct? Is `editAndTruncateConversation` called with proper args?

4. **30-second throttle** — Uses `allMessages[messageIndex]?.createdAt` (not UIMessage.createdAt which doesn't exist). Default hide when absent. Is this sufficient per design doc 5.5.3?

5. **Approve → unapprove roundtrip consistency** — Does `approveStage` write everything that `unapproveStage` reads? Specifically: `validatedAt`, `titleStrippedOnApproval`, `paperMemoryDigest`, `stageMessageBoundaries`, `paperTitle`, `workingTitle`, `completedAt`.

6. **No regressions** — Does the change affect `approveStage` behavior for sessions that never use cancel? (Should be no — flag is additive only.)

The full diff is included above.
