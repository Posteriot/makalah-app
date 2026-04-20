# Phase 1 Codex Review — Cancel Decision: Cancel Choice Card + Client State Fixes

## Review Scope

7 commits on branch `agent-harness`, range `0a4c2a0f..74daedc3`.
7 files changed, +254 / -12 lines.

**Design doc:** `docs/cancel-decision/design.md` (single source of truth)
**Implementation plan:** `docs/cancel-decision/plan.md`

## Commits (chronological)

1. `ff808cce` — `feat(cancel-decision): add decisionEpoch to paperSessions schema`
2. `c2947fdb` — `feat(cancel-decision): add stampDecisionEpoch mutation`
3. `b734e089` — `feat(cancel-decision): add cancelChoiceDecision mutation`
4. `018e9697` — `feat(cancel-decision): stamp decisionEpoch in orchestrate pipeline`
5. `9d878488` — `feat(cancel-decision): add decisionEpoch guard to chain-completion and rescue paths`
6. `eecb49d5` — `feat(cancel-decision): split submittedChoiceKeys into persisted + optimistic sets`
7. `74daedc3` — `feat(cancel-decision): add handleCancelChoice handler + Batalkan button for choice messages`

## Files Modified

| File | Commits | Lines | What Changed |
|------|---------|-------|-------------|
| `convex/schema.ts` | 1 | +3 | `decisionEpoch: v.optional(v.number())` in paperSessions |
| `convex/paperSessions.ts` | 2,3 | +82 | `stampDecisionEpoch` + `cancelChoiceDecision` mutations |
| `src/lib/chat-harness/executor/types.ts` | 4 | +1 | `myEpoch: number \| undefined` in OnFinishConfig |
| `src/lib/chat-harness/runtime/orchestrate-sync-run.ts` | 4 | +20 | Epoch stamp after paperSession query + pass to OnFinishConfig (primary + fallback paths) |
| `src/lib/chat-harness/executor/build-on-finish-handler.ts` | 5 | +30 | `isEpochCurrent()` helper + 3 epoch guards (chain-completion, lampiran rescue, judul rescue) |
| `src/components/chat/ChatWindow.tsx` | 6,7 | +84/-8 | Two-set submittedChoiceKeys refactor + `handleCancelChoice` handler + wire to MessageBubble |
| `src/components/chat/MessageBubble.tsx` | 7 | +46/-1 | `onCancelChoice`/`isStreaming` props + Batalkan button for `kind: "choice"` |

## Files NOT Modified (verify untouched)

| File | Reason |
|------|--------|
| `src/lib/chat-harness/entry/accept-chat-request.ts` | Epoch stamp is in orchestrate, not accept (no paperSessionId available) |
| `src/lib/chat-harness/types/runtime.ts` | AcceptedChatRequest not widened — epoch is local variable in orchestrate |
| `src/lib/utils/paperPermissions.ts` | No utility functions added — visibility guards are inline |
| `src/components/chat/json-renderer/JsonRendererChoiceBlock.tsx` | `isSubmitted` prop unchanged |
| `src/components/paper/PaperValidationPanel.tsx` | Panel driven by Convex reactivity, no change needed |

## What to Audit

### 1. `cancelChoiceDecision` mutation (design doc section 5.1)

**File:** `convex/paperSessions.ts` — new mutation after `resetStageDataForEditResend`

Verify:
- [ ] Uses `requirePaperSessionOwner` (not raw session fetch)
- [ ] Validates `currentStage` is in STAGE_ORDER
- [ ] Increments `decisionEpoch` (never resets to 0)
- [ ] `stageStatus === "pending_validation"` → set `"drafting"`
- [ ] `stageData[currentStage].artifactId` exists → `invalidatedAt: Date.now()` on artifact
- [ ] Clears `stageData[currentStage]` but preserves `revisionCount`
- [ ] Logs `[PAPER][cancel-choice]`

### 2. `stampDecisionEpoch` mutation (design doc section 5.3)

**File:** `convex/paperSessions.ts` — new mutation

Verify:
- [ ] Uses `requirePaperSessionOwner`
- [ ] Increments (not sets to arbitrary value)
- [ ] Returns `{ epoch: newValue }`
- [ ] Logs `[PAPER][stamp-epoch]`

### 3. Epoch pipeline (design doc section 5.5.4)

**Files:** `executor/types.ts`, `orchestrate-sync-run.ts`

Verify:
- [ ] `myEpoch` added to `OnFinishConfig` type (not `AcceptedChatRequest`)
- [ ] Stamped in `orchestrate-sync-run.ts` AFTER `paperSession` is queried (not in `accept-chat-request.ts`)
- [ ] Only stamps when `choiceInteractionEvent` is present AND `paperSession._id` exists
- [ ] Passed to BOTH primary path and fallback path OnFinishConfig
- [ ] Fallback `attemptFallbackExecution` function signature includes `myEpoch`

### 4. Epoch guards (design doc section 5.5.4)

**File:** `build-on-finish-handler.ts`

Verify:
- [ ] `isEpochCurrent()` re-reads session via `getById` query
- [ ] Returns `true` when `myEpoch === undefined` (non-choice requests pass through)
- [ ] Returns `false` when `session.decisionEpoch !== myEpoch`
- [ ] Guard applied to chain-completion (around line 624)
- [ ] Guard applied to lampiran rescue (around line 435)
- [ ] Guard applied to judul rescue (around line 497)
- [ ] `measureStep()` still called when epoch check fails (timing always recorded)

### 5. Two-set `submittedChoiceKeys` (design doc section 5.5.1)

**File:** `ChatWindow.tsx`

Verify:
- [ ] Old `useState<Set<string>>(new Set())` replaced with TWO sets: `persistedChoiceKeys` + `optimisticPendingKeys`
- [ ] `submittedChoiceKeys` derived via `useMemo` (combined set) — drop-in replacement
- [ ] `handleChoiceSubmit` writes to `optimisticPendingKeys` (not persisted)
- [ ] Rehydration useEffect full-derives `persistedChoiceKeys` (replaces, not merges)
- [ ] Rehydration migrates confirmed keys OUT of `optimisticPendingKeys`
- [ ] `MessageBubble` still receives `isChoiceSubmitted={submittedChoiceKeys.has(...)}` boolean (no interface change)

### 6. `handleCancelChoice` handler (design doc section 4.2)

**File:** `ChatWindow.tsx`

Verify:
- [ ] Handler receives `uiMessageId: string` (UIMessage.id), NOT Convex `_id`
- [ ] Maps `uiMessageId` → Convex `_id` via `historyMessages.find(m => m.uiMessageId === ...)`
- [ ] Calls `cancelChoiceDecision` mutation FIRST (state revert before message delete)
- [ ] Calls `editAndTruncateConversation` with Convex `Id<"messages">` and `content: ""`
- [ ] Truncates local messages via `setMessages(prev => prev.slice(0, index))`
- [ ] Removes key from BOTH `persistedChoiceKeys` AND `optimisticPendingKeys`
- [ ] Key lookup walks backward in `historyMessages` for `jsonRendererChoice` (NOT UIMessage)
- [ ] Clears `optimisticPendingValidation`
- [ ] No AI turn triggered (no `append`, `sendMessage`, or `reload` call)
- [ ] Error handling: `Sentry.captureException` + `toast.error`

### 7. Batalkan button in MessageBubble (design doc section 4.1)

**File:** `MessageBubble.tsx`

Verify:
- [ ] `onCancelChoice` and `isStreaming` added to props interface
- [ ] Button shows for `autoUserAction.kind === "choice"` only (not approved/revision)
- [ ] Uses `message.id` (UIMessage), not `message._id`
- [ ] Hidden when `isStreaming === true`
- [ ] Early `return` prevents edit icon from showing for choice messages (Batalkan XOR edit)
- [ ] Copy button still shown alongside Batalkan
- [ ] Icon imported from `iconoir-react` (consistent with project icon library)

### 8. Architecture integrity

- [ ] No modifications to `accept-chat-request.ts`
- [ ] No modifications to `types/runtime.ts` (AcceptedChatRequest)
- [ ] No modifications to `paperPermissions.ts`
- [ ] `resetStageDataForEditResend` still exists and unchanged (used for non-synthetic edit+resend)
- [ ] No new files created (all changes in existing files)

## Diff

Full diff follows for reference. Range: `0a4c2a0f..74daedc3`

```diff
diff --git a/convex/paperSessions.ts b/convex/paperSessions.ts
index b5012de1..a1cee847 100644
--- a/convex/paperSessions.ts
+++ b/convex/paperSessions.ts
@@ -753,6 +753,88 @@ export const resetStageDataForEditResend = mutation({
     },
 });
 
+/**
+ * Increment decisionEpoch and return new value.
+ * Called at start of server-side request processing when choiceInteractionEvent present.
+ * Ref: design doc section 5.3
+ */
+export const stampDecisionEpoch = mutation({
+    args: {
+        sessionId: v.id("paperSessions"),
+    },
+    handler: async (ctx, args) => {
+        const { session } = await requirePaperSessionOwner(ctx, args.sessionId);
+        const currentEpoch = session.decisionEpoch ?? 0;
+        const newEpoch = currentEpoch + 1;
+        await ctx.db.patch(args.sessionId, {
+            decisionEpoch: newEpoch,
+            updatedAt: Date.now(),
+        });
+        console.info(`[PAPER][stamp-epoch] stage=${session.currentStage} epoch=${newEpoch}`);
+        return { epoch: newEpoch };
+    },
+});
+
+/**
+ * Cancel a choice card decision. Reverts stageData, invalidates artifact if exists,
+ * reverts stageStatus from pending_validation to drafting, increments decisionEpoch.
+ * Ref: design doc section 5.1
+ */
+export const cancelChoiceDecision = mutation({
+    args: {
+        sessionId: v.id("paperSessions"),
+        userId: v.id("users"),
+    },
+    handler: async (ctx, args) => {
+        const { session } = await requirePaperSessionOwner(ctx, args.sessionId);
+
+        const currentStage = session.currentStage;
+        if (!STAGE_ORDER.includes(currentStage as PaperStageId)) {
+            throw new Error(`Cannot cancel: invalid stage "${currentStage}"`);
+        }
+
+        const stageData = session.stageData as Record<string, Record<string, unknown>>;
+        const currentStageData = stageData[currentStage] ?? {};
+
+        // Increment epoch (invalidates any in-flight chain-completion/rescue)
+        const currentEpoch = session.decisionEpoch ?? 0;
+        const newEpoch = currentEpoch + 1;
+
+        // Revert stageStatus if pending_validation
+        const statusReverted = session.stageStatus === "pending_validation";
+
+        // Invalidate artifact if exists
+        let artifactInvalidated = false;
+        const artifactId = currentStageData.artifactId as string | undefined;
+        if (artifactId) {
+            try {
+                await ctx.db.patch(artifactId as Id<"artifacts">, {
+                    invalidatedAt: Date.now(),
+                });
+                artifactInvalidated = true;
+            } catch {
+                console.warn(`[PAPER][cancel-choice] artifact patch failed id=${artifactId}`);
+            }
+        }
+
+        // Clear stageData (preserve revisionCount only)
+        const revisionCount = typeof currentStageData.revisionCount === "number"
+            ? currentStageData.revisionCount : 0;
+        const updatedStageData = { ...stageData };
+        updatedStageData[currentStage] = { revisionCount };
+
+        await ctx.db.patch(args.sessionId, {
+            stageData: updatedStageData,
+            stageStatus: statusReverted ? "drafting" : session.stageStatus,
+            decisionEpoch: newEpoch,
+            updatedAt: Date.now(),
+        });
+
+        console.info(`[PAPER][cancel-choice] stage=${currentStage} artifactInvalidated=${artifactInvalidated} statusReverted=${statusReverted} epoch=${newEpoch}`);
+        return { stage: currentStage, artifactInvalidated, statusReverted };
+    },
+});
+
 /**
  * Update data for the current stage.
  */
diff --git a/convex/schema.ts b/convex/schema.ts
index faaf6726..14c003f7 100644
--- a/convex/schema.ts
+++ b/convex/schema.ts
@@ -740,6 +740,9 @@ export default defineSchema({
     isSoftBlocked: v.optional(v.boolean()), // True jika kredit habis
     softBlockedAt: v.optional(v.number()), // Timestamp saat soft-blocked
 
+    // Cancel Decision: monotonic epoch counter for race prevention (design doc 5.5.4)
+    decisionEpoch: v.optional(v.number()),
+
     // Timestamps
     createdAt: v.number(),
     updatedAt: v.number(),
diff --git a/src/components/chat/ChatWindow.tsx b/src/components/chat/ChatWindow.tsx
index cb53b291..3aaee6df 100644
--- a/src/components/chat/ChatWindow.tsx
+++ b/src/components/chat/ChatWindow.tsx
@@ -574,7 +574,16 @@ export function ChatWindow({
   const [pendingRewindTarget, setPendingRewindTarget] = useState<PaperStageId | null>(null)
   const [isRewindSubmitting, setIsRewindSubmitting] = useState(false)
   const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)
-  const [submittedChoiceKeys, setSubmittedChoiceKeys] = useState<Set<string>>(new Set())
+  // Cancel Decision: two-set approach (design doc 5.5.1)
+  // persistedChoiceKeys — full-derived from historyMessages
+  // optimisticPendingKeys — bridges submit→persist gap, cleared on cancel or persistence confirm
+  const [persistedChoiceKeys, setPersistedChoiceKeys] = useState<Set<string>>(new Set())
+  const [optimisticPendingKeys, setOptimisticPendingKeys] = useState<Set<string>>(new Set())
+  // Derived combined set — replaces the old single submittedChoiceKeys state
+  const submittedChoiceKeys = useMemo(() =>
+      new Set([...persistedChoiceKeys, ...optimisticPendingKeys]),
+      [persistedChoiceKeys, optimisticPendingKeys]
+  )
   // Optimistic bridge: show approval panel immediately when onFinish detects
   // submitStageForValidation in message, without waiting for Convex subscription
   const [optimisticPendingValidation, setOptimisticPendingValidation] = useState(false)
@@ -877,6 +886,7 @@ export function ChatWindow({
   // 2. Initialize useChat with AI SDK v5/v6 API
   const editAndTruncate = useMutation(api.messages.editAndTruncateConversation)
   const resetStageDataForEditResendMutation = useMutation(api.paperSessions.resetStageDataForEditResend)
+  const cancelChoiceDecision = useMutation(api.paperSessions.cancelChoiceDecision)
 
   // Refs to always read latest attachment state at request time (bypasses useChat stale transport bug)
   const attachedFilesRef = useRef(attachedFiles)
@@ -1345,7 +1355,7 @@ export function ChatWindow({
     customText?: string
   }) => {
     const submissionKey = `${params.sourceMessageId}::${params.choicePartId}`
-    setSubmittedChoiceKeys((prev) => new Set([...prev, submissionKey]))
+    setOptimisticPendingKeys((prev) => new Set([...prev, submissionKey]))
 
     // V3 YAML: payload is { spec } — extract label + decisionMode from spec elements, stage from session
     const specAny = params.payload as unknown as { spec?: { elements?: Record<string, { type?: string; props?: { label?: string; optionId?: string; decisionMode?: string; workflowAction?: string } }> } }
@@ -1644,14 +1654,13 @@ export function ChatWindow({
     })
   }, [historyMessages, setMessages])
 
-  // Rehydrate submitted choice keys from history — mark choices that already have a follow-up user message
+  // Rehydrate submitted choice keys from history — full-derive persisted set
   useEffect(() => {
     if (!historyMessages || historyMessages.length === 0) return
     const keys = new Set<string>()
     for (let i = 0; i < historyMessages.length; i++) {
       const msg = historyMessages[i]
       if (msg.role === "user" && typeof msg.content === "string" && msg.content.startsWith("[Choice:")) {
-        // Walk backwards to find the assistant message with the choice card
         for (let j = i - 1; j >= 0; j--) {
           const prev = historyMessages[j]
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
@@ -1662,10 +1671,16 @@ export function ChatWindow({
         }
       }
     }
-    if (keys.size > 0) {
-      setSubmittedChoiceKeys((prev) => new Set([...prev, ...keys]))
-      console.log("[F1-F6-TEST] ChoiceRehydrate", { rehydratedCount: keys.size, keys: [...keys] })
-    }
+    // Full-derive: replace entire persisted set
+    setPersistedChoiceKeys(keys)
+    // Migrate confirmed keys from optimistic to persisted
+    setOptimisticPendingKeys((prev) => {
+      const next = new Set(prev)
+      for (const key of prev) {
+        if (keys.has(key)) next.delete(key)
+      }
+      return next.size === prev.size ? prev : next
+    })
   }, [historyMessages])
 
   const isLoading = status !== 'ready' && status !== 'error'
@@ -2343,6 +2358,57 @@ export function ChatWindow({
     }
   }
 
+  const handleCancelChoice = useCallback(async (uiMessageId: string, syntheticMessageIndex: number) => {
+    if (!userId || !paperSession?._id || !conversationId) return
+    try {
+      // 1. Revert Convex state
+      await cancelChoiceDecision({ sessionId: paperSession._id, userId })
+
+      // 2. Map UIMessage.id → Convex message._id for truncation
+      const convexMsg = historyMessages?.find(
+        (m) => m.uiMessageId === uiMessageId || String(m._id) === uiMessageId
+      )
+      if (convexMsg) {
+        await editAndTruncate({
+          messageId: convexMsg._id as Id<"messages">,
+          content: "", // Required arg, not used
+          conversationId: conversationId as Id<"conversations">,
+        })
+      }
+
+      // 3. Truncate local messages (UIMessage state)
+      setMessages((prev) => prev.slice(0, syntheticMessageIndex))
+
+      // 4. Remove from both choice key sets
+      if (historyMessages) {
+        const syntheticIdx = historyMessages.findIndex(
+          (m) => m.uiMessageId === uiMessageId || String(m._id) === uiMessageId
+        )
+        if (syntheticIdx > 0) {
+          for (let j = syntheticIdx - 1; j >= 0; j--) {
+            const prev = historyMessages[j]
+            // eslint-disable-next-line @typescript-eslint/no-explicit-any
+            if (prev.role === "assistant" && (prev as any).jsonRendererChoice) {
+              const key = `${prev._id}::${prev._id}-choice-spec`
+              setPersistedChoiceKeys((p) => { const n = new Set(p); n.delete(key); return n })
+              setOptimisticPendingKeys((p) => { const n = new Set(p); n.delete(key); return n })
+              break
+            }
+          }
+        }
+      }
+
+      // 5. Clear optimistic pending validation if it was set
+      setOptimisticPendingValidation(false)
+
+      console.info("[CANCEL-DECISION] choice cancelled, card re-activated")
+    } catch (error) {
+      Sentry.captureException(error, { tags: { subsystem: "paper.cancel-choice" } })
+      console.error("Failed to cancel choice:", error)
+      toast.error("Gagal membatalkan pilihan.")
+    }
+  }, [userId, paperSession?._id, conversationId, historyMessages, cancelChoiceDecision, editAndTruncate, setMessages])
+
   // Handler for template selection
   const handleTemplateSelect = (template: Template) => {
     if (isLoading) return
@@ -2766,6 +2832,8 @@ export function ChatWindow({
                         onOpenSources={handleOpenSources}
                         isChoiceSubmitted={submittedChoiceKeys.has(`${message.id}::${message.id}-choice-spec`)}
                         onChoiceSubmit={handleChoiceSubmit}
+                        onCancelChoice={handleCancelChoice}
+                        isStreaming={status === "streaming"}
                       />
                     </div>
                   </div>
diff --git a/src/components/chat/MessageBubble.tsx b/src/components/chat/MessageBubble.tsx
index cffb32cd..84c71615 100644
--- a/src/components/chat/MessageBubble.tsx
+++ b/src/components/chat/MessageBubble.tsx
@@ -1,7 +1,7 @@
 "use client"
 
 import { UIMessage } from "ai"
-import { EditPencil, Xmark, Send, CheckCircle, Copy, Check } from "iconoir-react"
+import { EditPencil, Xmark, Send, CheckCircle, Copy, Check, Undo } from "iconoir-react"
 import { QuickActions } from "./QuickActions"
 import { ArtifactIndicator } from "./ArtifactIndicator"
 import { SourcesIndicator } from "./SourcesIndicator"
@@ -177,6 +177,8 @@ interface MessageBubbleProps {
         selectedOptionId: string
         customText?: string
     }) => void | Promise<void>
+    onCancelChoice?: (messageId: string, messageIndex: number) => void
+    isStreaming?: boolean
 }
 
 export function MessageBubble({
@@ -196,6 +198,8 @@ export function MessageBubble({
     onOpenSources,
     isChoiceSubmitted,
     onChoiceSubmit,
+    onCancelChoice,
+    isStreaming,
 }: MessageBubbleProps) {
     const [isEditing, setIsEditing] = useState(false)
     const [editContent, setEditContent] = useState("")
@@ -1160,6 +1164,46 @@ export function MessageBubble({
                 const copiedBtnStyle: React.CSSProperties = { color: "var(--chat-success)" }
                 const actionBtnClass = "p-1.5 rounded-action transition-colors hover:bg-[color:var(--chat-accent)]"
                 const actionIconClass = "h-4 w-4"
+
+                // Cancel Decision: Batalkan button for choice synthetic messages
+                // autoUserAction is derived from message.parts above (line ~459)
+                const autoAction = autoUserAction
+                if (autoAction?.kind === "choice" && onCancelChoice) {
+                    const cancelAllowed = !isStreaming
+                    return (
+                    <div className="flex flex-col items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity pt-2">
+                        {cancelAllowed ? (
+                            <Tooltip>
+                                <TooltipTrigger asChild>
+                                    <button
+                                        onClick={() => onCancelChoice(message.id, messageIndex)}
+                                        className={actionBtnClass}
+                                        style={{ color: "var(--chat-warning-foreground, var(--chat-muted-foreground))" }}
+                                        aria-label="Batalkan pilihan"
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
diff --git a/src/lib/chat-harness/executor/build-on-finish-handler.ts b/src/lib/chat-harness/executor/build-on-finish-handler.ts
index 7b050b2d..7bc24c2c 100644
--- a/src/lib/chat-harness/executor/build-on-finish-handler.ts
+++ b/src/lib/chat-harness/executor/build-on-finish-handler.ts
@@ -148,6 +148,7 @@ export function buildOnFinishHandler(
         fetchQueryWithToken,
         fetchMutationWithToken,
         requestStartedAt,
+        myEpoch,
         isDraftingStage,
         isHasilPostChoice,
         enableGroundingExtraction,
@@ -158,6 +159,26 @@ export function buildOnFinishHandler(
         eventStore,
     } = config
 
+    /** Check if this request's epoch is still current. Returns false if decision changed. */
+    async function isEpochCurrent(
+        sessionId: string,
+        epoch: number | undefined,
+        label: string
+    ): Promise<boolean> {
+        if (epoch === undefined) return true // No epoch stamped = not a choice request
+        try {
+            const fresh = await fetchQueryWithToken(api.paperSessions.getById, { sessionId })
+            if (fresh && (fresh as { decisionEpoch?: number }).decisionEpoch !== epoch) {
+                console.info(`[${label}] aborted: epoch drift (mine=${epoch}, current=${(fresh as { decisionEpoch?: number }).decisionEpoch})`)
+                return false
+            }
+        } catch {
+            // If we can't check, proceed cautiously
+            console.warn(`[${label}] epoch check failed, proceeding`)
+        }
+        return true
+    }
+
     const logTag = streamCtx.telemetry.failoverUsed ? "[fallback]" : ""
 
     const handler = async (result: {
@@ -414,7 +435,8 @@ export function buildOnFinishHandler(
         ) {
             console.info(`[PAPER][rescue] stage=lampiran reason=${lampiranRescueCheck.reason} fallbackPolicy=${resolvedWorkflow?.fallbackPolicy ?? "legacy"}${logTag ? ` path=fallback` : ""}`)
             const lampiranRescueStart = Date.now()
-            try {
+            const lampiranEpochOk = await isEpochCurrent(paperSession!._id, myEpoch, "LAMPIRAN-RESCUE")
+            if (lampiranEpochOk) try {
                 const lampiranStageData = (paperSession!.stageData as Record<string, Record<string, unknown> | undefined> | undefined)?.["lampiran"]
                 const alasan = typeof lampiranStageData?.alasanTidakAda === "string" ? lampiranStageData.alasanTidakAda : ""
                 const placeholderContent = alasan
@@ -475,7 +497,8 @@ export function buildOnFinishHandler(
         ) {
             console.info(`[PAPER][rescue] stage=judul reason=${judulRescueCheck.reason} fallbackPolicy=${resolvedWorkflow?.fallbackPolicy ?? "legacy"}${logTag ? ` path=fallback` : ""}`)
             const judulRescueStart = Date.now()
-            try {
+            const judulEpochOk = await isEpochCurrent(paperSession!._id, myEpoch, "JUDUL-RESCUE")
+            if (judulEpochOk) try {
                 let selectedTitle: string | undefined
                 try {
                     const sourceMsg = await retryQuery(
@@ -601,7 +624,8 @@ export function buildOnFinishHandler(
             !paperToolTracker.sawSubmitValidationSuccess
         ) {
             const chainStartTime = Date.now()
-            try {
+            const chainEpochOk = await isEpochCurrent(paperSession!._id, myEpoch, "CHAIN-COMPLETION")
+            if (chainEpochOk) try {
                 const artifactContent = normalizedText.trim() || persistedContent.trim() || "Draft content"
                 const artifactTitle = getStageLabel(paperStageScope as PaperStageId)
 
diff --git a/src/lib/chat-harness/executor/types.ts b/src/lib/chat-harness/executor/types.ts
index 159b9e31..3906f17b 100644
--- a/src/lib/chat-harness/executor/types.ts
+++ b/src/lib/chat-harness/executor/types.ts
@@ -120,6 +120,7 @@ export interface OnFinishConfig {
     fetchQueryWithToken: ConvexFetchQuery
     fetchMutationWithToken: ConvexFetchMutation
     requestStartedAt: number | undefined
+    myEpoch: number | undefined  // Cancel decision: epoch at choice submission time
     isDraftingStage: boolean
     isHasilPostChoice: boolean
     buildLeakageSnippet: (text: string, matchIndex: number, matchValue: string) => string
diff --git a/src/lib/chat-harness/runtime/orchestrate-sync-run.ts b/src/lib/chat-harness/runtime/orchestrate-sync-run.ts
index a3df17c2..0bb9bce8 100644
--- a/src/lib/chat-harness/runtime/orchestrate-sync-run.ts
+++ b/src/lib/chat-harness/runtime/orchestrate-sync-run.ts
@@ -242,6 +242,21 @@ export async function orchestrateSyncRun(
     }
     const { resolvedWorkflow, choiceContextNote } = choiceResult
 
+    // Cancel Decision: stamp epoch when this is a choice interaction request
+    let myEpoch: number | undefined
+    if (accepted.choiceInteractionEvent && paperContext.paperSession?._id) {
+        try {
+            const epochResult = await accepted.fetchMutationWithToken(
+                api.paperSessions.stampDecisionEpoch,
+                { sessionId: paperContext.paperSession._id }
+            )
+            myEpoch = (epochResult as { epoch: number }).epoch
+            console.info(`[CANCEL-DECISION] epoch stamped: ${myEpoch} for stage=${paperContext.paperSession.currentStage}`)
+        } catch (epochErr) {
+            console.warn(`[CANCEL-DECISION] stampDecisionEpoch failed:`, epochErr)
+        }
+    }
+
     const isPaperMode = !!paperContext.paperModePrompt
 
     // Skill telemetry context (depends on paperContext + isPaperMode).
@@ -418,6 +433,7 @@ export async function orchestrateSyncRun(
                 fetchQueryWithToken: accepted.fetchQueryWithToken,
                 fetchMutationWithToken: accepted.fetchMutationWithToken,
                 requestStartedAt: accepted.requestStartedAt,
+                myEpoch,
                 isDraftingStage: paperContext.isDraftingStage,
                 isHasilPostChoice: paperContext.isHasilPostChoice,
                 buildLeakageSnippet: buildLeakageSnippetFn,
@@ -481,6 +497,7 @@ export async function orchestrateSyncRun(
             maybeUpdateTitleFromAI: conversation.maybeUpdateTitleFromAI,
             isPaperMode,
             skillTelemetryContext,
+            myEpoch,
             originalError: error,
         })
         return { kind: "stream", response: fallbackResponse }
@@ -723,6 +740,7 @@ async function attemptFallbackExecution(params: {
     }) => Promise<void>
     isPaperMode: boolean
     skillTelemetryContext: Record<string, unknown>
+    myEpoch: number | undefined
     originalError: unknown
 }): Promise<Response> {
     const {
@@ -739,6 +757,7 @@ async function attemptFallbackExecution(params: {
         maybeUpdateTitleFromAI,
         isPaperMode,
         skillTelemetryContext,
+        myEpoch,
         originalError,
     } = params
 
@@ -889,6 +908,7 @@ async function attemptFallbackExecution(params: {
             fetchQueryWithToken: accepted.fetchQueryWithToken,
             fetchMutationWithToken: accepted.fetchMutationWithToken,
             requestStartedAt: accepted.requestStartedAt,
+            myEpoch,
             isDraftingStage: paperContext.isDraftingStage,
             isHasilPostChoice: paperContext.isHasilPostChoice,
             buildLeakageSnippet: buildLeakageSnippetFn,
```
