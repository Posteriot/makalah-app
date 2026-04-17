# Codex Review Prompt — Phase 2 Patch Round 1

You are reviewing a patch that addresses the blocking finding from your audit of the cancel-decision Phase 2 implementation.

## Context

- Design source of truth: `docs/cancel-decision/design.md` sections 4.3, 5.2, 5.5.3
- Phase 2 audit finding: provided inline (approval cancel exposed too broadly)
- Patch report with full rationale: `docs/cancel-decision/audit-report-prompt/phase-2-patch-round-1-report.md`
- Branch: `agent-harness`

## What was patched

**Blocking finding:** Batalkan button for `[Approved:]` synthetic messages was shown on ALL approved messages (gated only by streaming + 30s throttle). A historical `[Approved: Gagasan Paper]` could trigger `unapproveStage` which operates on the current previous stage, causing a clicked-message vs reverted-stage mismatch.

**Fix:** Added `cancelableApprovalMessageId` computation in `ChatWindow.tsx`:
1. **Session state gate** mirrors the backend `unapproveStage` guard: only allows `stageStatus === "drafting"` (normal) or `currentStage === "completed" && stageStatus === "approved"` (final)
2. **Latest [Approved:] scan** finds the single most recent approved message — by stage ordering, this always corresponds to the current previous stage
3. Passed as prop to MessageBubble, gating the approval Batalkan branch

## Files changed

Only 2 files were modified for this finding:

- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/MessageBubble.tsx`

## Your task

Review the patch for correctness and completeness against the audit finding.

### Review checklist

1. Session state gate mirrors backend `unapproveStage` guard (stageStatus + currentStage checks)
2. Latest `[Approved:]` backward scan correctly identifies the one for the current previous stage
3. Historical approved messages from older stages do not show Batalkan
4. `currentStage === "completed"` correctly allows unapproving judul
5. Session in `pending_validation` or other non-drafting states correctly hides all approval Batalkan
6. 30-second throttle and streaming guard still apply on top of eligibility
7. `hideEditForSynthetic` still hides edit on ALL approved synthetics
8. No backend changes (boundary mismatch warning left as-is)
9. No scope expansion into choice/revision/epoch work
10. No new bugs introduced

### Secondary concern

`convex/paperSessions.ts:907-913` warns and skips boundary removal on stage mismatch but proceeds with unapproval. The patch report argues this is correct (non-destructive skip). Do you agree, or is a narrowly-scoped guard needed?

### Report format

For each checklist item: PASS, FAIL (with explanation), or CONCERN (non-blocking observation).
Then: assessment of secondary concern.
Then: any net-new findings.
Then: final verdict — APPROVED or CHANGES REQUESTED.

## Diff (Phase 2 changes only — incremental from Phase 1 patch baseline)

```diff
diff --git a/src/components/chat/ChatWindow.tsx b/src/components/chat/ChatWindow.tsx
--- a/src/components/chat/ChatWindow.tsx (after Phase 1 patches)
+++ b/src/components/chat/ChatWindow.tsx (Phase 2 patch)
@@ (after cancelableChoiceMessageId useMemo)
+  // Cancel Decision: derive which approved message (if any) is currently cancelable.
+  // Only the latest [Approved:] is eligible, and only when session state allows unapproval.
+  // Backend guard mirrors: stageStatus === "drafting" (normal) or completed+approved (final).
+  const cancelableApprovalMessageId = useMemo(() => {
+    if (!paperSession) return null
+    const isNormalApproval = paperSession.stageStatus === "drafting"
+    const isFinalApproval = paperSession.currentStage === "completed" && paperSession.stageStatus === "approved"
+    if (!isNormalApproval && !isFinalApproval) return null
+    // Find the latest [Approved:] — by construction this is the one for the current previous stage
+    for (let i = messages.length - 1; i >= 0; i--) {
+      const msg = messages[i]
+      if (msg.role !== "user") continue
+      const textPart = msg.parts?.find((p) => p.type === "text") as { text?: string } | undefined
+      const text = textPart?.text ?? ""
+      if (text.startsWith("[Approved:")) return msg.id
+    }
+    return null
+  }, [messages, paperSession])

@@ (MessageBubble render call)
+                        cancelableApprovalMessageId={cancelableApprovalMessageId}

diff --git a/src/components/chat/MessageBubble.tsx b/src/components/chat/MessageBubble.tsx
@@ (props interface)
+    /** ID of the single message eligible for approval cancel (computed in ChatWindow) */
+    cancelableApprovalMessageId?: string | null

@@ (destructure)
+    cancelableApprovalMessageId,

@@ (approval Batalkan gate)
-                if (autoAction?.kind === "approved" && onCancelApproval) {
+                if (autoAction?.kind === "approved" && onCancelApproval && message.id === cancelableApprovalMessageId) {
```

## Full cumulative diff (all patches: Phase 1 round 1+2, Phase 2 round 1)

```diff
diff --git a/src/components/chat/ChatWindow.tsx b/src/components/chat/ChatWindow.tsx
index 6c24f3da..14a0f153 100644
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
@@ -1684,6 +1691,43 @@ export function ChatWindow({
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
+  // Cancel Decision: derive which approved message (if any) is currently cancelable.
+  // Only the latest [Approved:] is eligible, and only when session state allows unapproval.
+  // Backend guard mirrors: stageStatus === "drafting" (normal) or completed+approved (final).
+  const cancelableApprovalMessageId = useMemo(() => {
+    if (!paperSession) return null
+    const isNormalApproval = paperSession.stageStatus === "drafting"
+    const isFinalApproval = paperSession.currentStage === "completed" && paperSession.stageStatus === "approved"
+    if (!isNormalApproval && !isFinalApproval) return null
+    // Find the latest [Approved:] — by construction this is the one for the current previous stage
+    for (let i = messages.length - 1; i >= 0; i--) {
+      const msg = messages[i]
+      if (msg.role !== "user") continue
+      const textPart = msg.parts?.find((p) => p.type === "text") as { text?: string } | undefined
+      const text = textPart?.text ?? ""
+      if (text.startsWith("[Approved:")) return msg.id
+    }
+    return null
+  }, [messages, paperSession])
+
   const isLoading = status !== 'ready' && status !== 'error'
   const isGenerating = status === "submitted" || status === "streaming"
 
@@ -2380,7 +2424,7 @@ export function ChatWindow({
       // 3. Truncate local messages (UIMessage state)
       setMessages((prev) => prev.slice(0, syntheticMessageIndex))
 
-      // 4. Remove from both choice key sets
+      // 4. Remove ALL equivalent key variants from both choice key sets
       if (historyMessages) {
         const syntheticIdx = historyMessages.findIndex(
           (m) => m.uiMessageId === uiMessageId || String(m._id) === uiMessageId
@@ -2390,9 +2434,17 @@ export function ChatWindow({
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
@@ -2868,6 +2920,8 @@ export function ChatWindow({
                         onCancelChoice={handleCancelChoice}
                         onCancelApproval={handleCancelApproval}
                         isStreaming={status === "streaming"}
+                        cancelableChoiceMessageId={cancelableChoiceMessageId}
+                        cancelableApprovalMessageId={cancelableApprovalMessageId}
                       />
                     </div>
                   </div>
diff --git a/src/components/chat/MessageBubble.tsx b/src/components/chat/MessageBubble.tsx
index e7b1f8e1..18b8931a 100644
--- a/src/components/chat/MessageBubble.tsx
+++ b/src/components/chat/MessageBubble.tsx
@@ -180,6 +180,10 @@ interface MessageBubbleProps {
     onCancelChoice?: (messageId: string, messageIndex: number) => void
     onCancelApproval?: (messageId: string, messageIndex: number) => void
     isStreaming?: boolean
+    /** ID of the single message eligible for choice cancel (computed in ChatWindow) */
+    cancelableChoiceMessageId?: string | null
+    /** ID of the single message eligible for approval cancel (computed in ChatWindow) */
+    cancelableApprovalMessageId?: string | null
 }
 
 export function MessageBubble({
@@ -202,6 +206,8 @@ export function MessageBubble({
     onCancelChoice,
     onCancelApproval,
     isStreaming,
+    cancelableChoiceMessageId,
+    cancelableApprovalMessageId,
 }: MessageBubbleProps) {
     const [isEditing, setIsEditing] = useState(false)
     const [editContent, setEditContent] = useState("")
@@ -1170,7 +1176,7 @@ export function MessageBubble({
                 // Cancel Decision: Batalkan button for choice synthetic messages
                 // autoUserAction is derived from message.parts above (line ~459)
                 const autoAction = autoUserAction
-                if (autoAction?.kind === "choice" && onCancelChoice) {
+                if (autoAction?.kind === "choice" && onCancelChoice && message.id === cancelableChoiceMessageId) {
                     const cancelAllowed = !isStreaming
                     return (
                     <div className="flex flex-col items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity pt-2">
@@ -1207,7 +1213,7 @@ export function MessageBubble({
                 }
 
                 // Cancel Decision: Batalkan button for approved synthetic messages
-                if (autoAction?.kind === "approved" && onCancelApproval) {
+                if (autoAction?.kind === "approved" && onCancelApproval && message.id === cancelableApprovalMessageId) {
                     // 30-second throttle via allMessages[messageIndex].createdAt (design doc 5.5.3)
                     const messageCreatedAt = allMessages[messageIndex]?.createdAt ?? 0
                     const messageAge = messageCreatedAt ? Date.now() - messageCreatedAt : 0
```
