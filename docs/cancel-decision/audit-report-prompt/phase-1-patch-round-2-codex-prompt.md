# Codex Review Prompt — Phase 1 Patch Round 2

You are reviewing a single-line logic fix that addresses the remaining blocking finding from your review of the Phase 1 patch.

## Context

- Design source of truth: `docs/cancel-decision/design.md`
- Round 1 audit findings: `docs/cancel-decision/audit-report-prompt/phase-1-review-round-1.md`
- Round 1 patch report: `docs/cancel-decision/audit-report-prompt/phase-1-patch-round-1-report.md`
- Round 2 patch report: `docs/cancel-decision/audit-report-prompt/phase-1-patch-round-2-report.md`
- Branch: `agent-harness`

## What was patched

**Blocking finding:** `cancelableChoiceMessageId` backward scan only treated `[Approved:]` as a hard stop. `[Revisi untuk ...]` was ignored, so choice cancel was still exposed during revision flows.

**Fix:** Added `if (text.startsWith("[Revisi untuk")) return null` to the backward scan in `cancelableChoiceMessageId`, treating revision synthetics as a boundary alongside approval synthetics. One line of logic, comment updates.

## Files changed

Only 1 file was modified for this round:

- `src/components/chat/ChatWindow.tsx` (line 1706)

## Your task

Review whether the revision boundary correctly closes the Phase 1 eligibility gap without introducing new issues.

### Review checklist

1. `[Revisi untuk ...]` correctly prevents choice cancel when revision exists after choice
2. `[Approved:]` boundary still works (not broken by the new check)
3. `currentStage === "completed"` boundary still works
4. Normal current-stage choice with no revision/approval is still cancelable
5. Format match: `text.startsWith("[Revisi untuk")` matches the emitted format at `ChatWindow.tsx:2378`
6. No scope expansion (no backend changes, no approval changes, no epoch changes)
7. No new edge cases introduced

### Report format

For each checklist item: PASS, FAIL (with explanation), or CONCERN (non-blocking observation).
Then: any net-new findings.
Then: final verdict — APPROVED or CHANGES REQUESTED.

## Diff (round 2 incremental — only the eligibility change)

The only change from round 1 to round 2 is inside the `cancelableChoiceMessageId` useMemo:

```diff
   // Cancel Decision: derive which choice message (if any) is currently cancelable.
-  // Only the latest [Choice:] synthetic that has no subsequent [Approved:] is eligible.
-  // Historical choices from previous stages always have an [Approved:] after them.
+  // Only the latest [Choice:] synthetic with no subsequent [Approved:] or [Revisi untuk] is eligible.
+  // Boundaries: [Approved:] = stage advanced, [Revisi untuk] = revision flow entered (Phase 1 doesn't handle revision cancel).
   const cancelableChoiceMessageId = useMemo(() => {
     if (!paperSession || paperSession.currentStage === "completed") return null
-    // Scan backward: if we hit [Approved:] before [Choice:], nothing is cancelable
+    // Scan backward: if we hit [Approved:] or [Revisi untuk] before [Choice:], nothing is cancelable
     for (let i = messages.length - 1; i >= 0; i--) {
       const msg = messages[i]
       if (msg.role !== "user") continue
       const textPart = msg.parts?.find((p) => p.type === "text") as { text?: string } | undefined
       const text = textPart?.text ?? ""
       if (text.startsWith("[Approved:")) return null
+      if (text.startsWith("[Revisi untuk")) return null
       if (text.startsWith("[Choice:")) return msg.id
     }
     return null
   }, [messages, paperSession])
```

## Full cumulative diff (round 1 + round 2 combined vs pre-patch baseline)

For full context, here is the complete diff of all changes from both rounds against the pre-patch state:

```diff
diff --git a/src/components/chat/ChatWindow.tsx b/src/components/chat/ChatWindow.tsx
index 6c24f3da..882e43b0 100644
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
@@ -1684,6 +1691,24 @@ export function ChatWindow({
     })
   }, [historyMessages])
 
+  // Cancel Decision: derive which choice message (if any) is currently cancelable.
+  // Only the latest [Choice:] synthetic with no subsequent [Approved:] or [Revisi untuk] is eligible.
+  // Boundaries: [Approved:] = stage advanced, [Revisi untuk] = revision flow entered (Phase 1 doesn't handle revision cancel).
+  const cancelableChoiceMessageId = useMemo(() => {
+    if (!paperSession || paperSession.currentStage === "completed") return null
+    // Scan backward: if we hit [Approved:] or [Revisi untuk] before [Choice:], nothing is cancelable
+    for (let i = messages.length - 1; i >= 0; i--) {
+      const msg = messages[i]
+      if (msg.role !== "user") continue
+      const textPart = msg.parts?.find((p) => p.type === "text") as { text?: string } | undefined
+      const text = textPart?.text ?? ""
+      if (text.startsWith("[Approved:")) return null
+      if (text.startsWith("[Revisi untuk")) return null
+      if (text.startsWith("[Choice:")) return msg.id
+    }
+    return null
+  }, [messages, paperSession])
+
   const isLoading = status !== 'ready' && status !== 'error'
   const isGenerating = status === "submitted" || status === "streaming"
 
@@ -2380,7 +2405,7 @@ export function ChatWindow({
       // 3. Truncate local messages (UIMessage state)
       setMessages((prev) => prev.slice(0, syntheticMessageIndex))
 
-      // 4. Remove from both choice key sets
+      // 4. Remove ALL equivalent key variants from both choice key sets
       if (historyMessages) {
         const syntheticIdx = historyMessages.findIndex(
           (m) => m.uiMessageId === uiMessageId || String(m._id) === uiMessageId
@@ -2390,9 +2415,17 @@ export function ChatWindow({
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
@@ -2868,6 +2901,7 @@ export function ChatWindow({
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
