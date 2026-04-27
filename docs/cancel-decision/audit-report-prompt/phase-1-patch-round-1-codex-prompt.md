# Codex Review Prompt — Phase 1 Patch Round 1

You are reviewing a patch that addresses two critical findings from your previous audit of the cancel-decision Phase 1 implementation.

## Context

- Design source of truth: `docs/cancel-decision/design.md`
- Original audit findings: `docs/cancel-decision/audit-report-prompt/phase-1-review-round-1.md`
- Patch report with full rationale: `docs/cancel-decision/audit-report-prompt/phase-1-patch-round-1-report.md`
- Branch: `agent-harness`

## What was patched

**Finding 1 (cancel eligibility):** Batalkan button was shown on ALL `[Choice:]` synthetic messages. Now only shown on the single latest cancelable choice — computed in `ChatWindow.tsx` via `cancelableChoiceMessageId` useMemo, passed as prop to `MessageBubble.tsx`.

**Finding 2 (key normalization):** Submitted-choice keys used different identifiers (live AI SDK `message.id` vs Convex `_id`), causing cancel to fail to reactivate the choice card. Now rehydration and cancel both handle BOTH key variants (`_id` + `uiMessageId`).

## Files changed

Only 2 files were modified:

- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/MessageBubble.tsx`

## Your task

Review the patch for correctness and completeness against the original findings. The diff is below.

### Review checklist

1. `cancelableChoiceMessageId` correctly returns null when latest synthetic is `[Approved:]`
2. `cancelableChoiceMessageId` correctly returns null when `currentStage === "completed"`
3. `cancelableChoiceMessageId` returns the latest `[Choice:]` message ID when no approval follows
4. Rehydration adds both `_id` and `uiMessageId` key variants to `persistedChoiceKeys`
5. Cancel removes both `_id` and `uiMessageId` key variants from both sets (`persistedChoiceKeys` + `optimisticPendingKeys`)
6. Optimistic-to-persisted migration now works (live-ID key matches persisted uiMessageId variant)
7. `hideEditForSynthetic` still hides edit on ALL choice/approved synthetics (not gated on cancelability)
8. No scope expansion beyond Phase 1 choice cancel
9. No new bugs introduced by the patch
10. Edge cases: what happens when [Revisi:] exists between [Choice:] and current state?

### Report format

For each checklist item: PASS, FAIL (with explanation), or CONCERN (non-blocking observation).
Then: any net-new findings the patch introduces.
Then: final verdict — APPROVED or CHANGES REQUESTED.

## Diff

```diff
diff --git a/src/components/chat/ChatWindow.tsx b/src/components/chat/ChatWindow.tsx
index 6c24f3da..8e67e691 100644
--- a/src/components/chat/ChatWindow.tsx
+++ b/src/components/chat/ChatWindow.tsx
@@ -1656,6 +1656,7 @@ export function ChatWindow({
   }, [historyMessages, setMessages])
 
   // Rehydrate submitted choice keys from history — full-derive persisted set
+  // Adds BOTH _id and uiMessageId key variants so checks work with either identifier
   useEffect(() => {
     if (!historyMessages || historyMessages.length === 0) return
     const keys = new Set<string>()
@@ -1666,7 +1667,13 @@ export function ChatWindow({
           const prev = historyMessages[j]
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           if (prev.role === "assistant" && (prev as any).jsonRendererChoice) {
+            // _id variant (used after history hydration where message.id = _id)
             keys.add(`${prev._id}::${prev._id}-choice-spec`)
+            // uiMessageId variant (used during live session where message.id = AI SDK id)
+            const uiId = (prev as any).uiMessageId as string | undefined
+            if (uiId && uiId !== String(prev._id)) {
+              keys.add(`${uiId}::${uiId}-choice-spec`)
+            }
             break
           }
         }
@@ -1684,6 +1691,23 @@ export function ChatWindow({
     })
   }, [historyMessages])
 
+  // Cancel Decision: derive which choice message (if any) is currently cancelable.
+  // Only the latest [Choice:] synthetic that has no subsequent [Approved:] is eligible.
+  // Historical choices from previous stages always have an [Approved:] after them.
+  const cancelableChoiceMessageId = useMemo(() => {
+    if (!paperSession || paperSession.currentStage === "completed") return null
+    // Scan backward: if we hit [Approved:] before [Choice:], nothing is cancelable
+    for (let i = messages.length - 1; i >= 0; i--) {
+      const msg = messages[i]
+      if (msg.role !== "user") continue
+      const textPart = msg.parts?.find((p) => p.type === "text") as { text?: string } | undefined
+      const text = textPart?.text ?? ""
+      if (text.startsWith("[Approved:")) return null
+      if (text.startsWith("[Choice:")) return msg.id
+    }
+    return null
+  }, [messages, paperSession])
+
   const isLoading = status !== 'ready' && status !== 'error'
   const isGenerating = status === "submitted" || status === "streaming"
 
@@ -2380,7 +2404,7 @@ export function ChatWindow({
       // 3. Truncate local messages (UIMessage state)
       setMessages((prev) => prev.slice(0, syntheticMessageIndex))
 
-      // 4. Remove from both choice key sets
+      // 4. Remove ALL equivalent key variants from both choice key sets
       if (historyMessages) {
         const syntheticIdx = historyMessages.findIndex(
           (m) => m.uiMessageId === uiMessageId || String(m._id) === uiMessageId
@@ -2390,9 +2414,17 @@ export function ChatWindow({
             const prev = historyMessages[j]
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             if (prev.role === "assistant" && (prev as any).jsonRendererChoice) {
-              const key = `${prev._id}::${prev._id}-choice-spec`
-              setPersistedChoiceKeys((p) => { const n = new Set(p); n.delete(key); return n })
-              setOptimisticPendingKeys((p) => { const n = new Set(p); n.delete(key); return n })
+              // Remove _id variant
+              const idKey = `${prev._id}::${prev._id}-choice-spec`
+              // Remove uiMessageId variant (live session uses this)
+              const uiId = (prev as any).uiMessageId as string | undefined
+              const uiKey = uiId && uiId !== String(prev._id) ? `${uiId}::${uiId}-choice-spec` : null
+              setPersistedChoiceKeys((p) => {
+                const n = new Set(p); n.delete(idKey); if (uiKey) n.delete(uiKey); return n
+              })
+              setOptimisticPendingKeys((p) => {
+                const n = new Set(p); n.delete(idKey); if (uiKey) n.delete(uiKey); return n
+              })
               break
             }
           }
@@ -2868,6 +2900,7 @@ export function ChatWindow({
                         onCancelChoice={handleCancelChoice}
                         onCancelApproval={handleCancelApproval}
                         isStreaming={status === "streaming"}
+                        cancelableChoiceMessageId={cancelableChoiceMessageId}
                       />
                     </div>
                   </div>
diff --git a/src/components/chat/MessageBubble.tsx b/src/components/chat/MessageBubble.tsx
index e7b1f8e1..05dedd71 100644
--- a/src/components/chat/MessageBubble.tsx
+++ b/src/components/chat/MessageBubble.tsx
@@ -180,6 +180,8 @@ interface MessageBubbleProps {
     onCancelChoice?: (messageId: string, messageIndex: number) => void
     onCancelApproval?: (messageId: string, messageIndex: number) => void
     isStreaming?: boolean
+    /** ID of the single message eligible for choice cancel (computed in ChatWindow) */
+    cancelableChoiceMessageId?: string | null
 }
 
 export function MessageBubble({
@@ -202,6 +204,7 @@ export function MessageBubble({
     onCancelChoice,
     onCancelApproval,
     isStreaming,
+    cancelableChoiceMessageId,
 }: MessageBubbleProps) {
     const [isEditing, setIsEditing] = useState(false)
     const [editContent, setEditContent] = useState("")
@@ -1170,7 +1173,7 @@ export function MessageBubble({
                 // Cancel Decision: Batalkan button for choice synthetic messages
                 // autoUserAction is derived from message.parts above (line ~459)
                 const autoAction = autoUserAction
-                if (autoAction?.kind === "choice" && onCancelChoice) {
+                if (autoAction?.kind === "choice" && onCancelChoice && message.id === cancelableChoiceMessageId) {
                     const cancelAllowed = !isStreaming
                     return (
                     <div className="flex flex-col items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity pt-2">
```
