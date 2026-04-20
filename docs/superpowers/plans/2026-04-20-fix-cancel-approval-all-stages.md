# Fix Cancel Approval on All Validated Stages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Batalkan" (cancel) button appear on ALL validated stage approval messages, not just the latest one. Proven pattern from commit `19e7e473` (choice card fix).

**Architecture:** Frontend-only fix. Change `cancelableApprovalMessageId` (single string) to `cancelableApprovalMessageIds` (Set), update the MessageBubble check from `===` to `.has()`, and add cross-stage rollback logic to `handleCancelApproval` by calling `unapproveStage` N times in sequence (identical pattern to `handleCancelChoice`). Zero backend changes — `unapproveStage` already handles per-step rollback correctly.

**Tech Stack:** React (ChatWindow.tsx, MessageBubble.tsx)

**Proven pattern:** Commit `19e7e473` solved the identical problem for choice cards. Commit `0c291edf` established the Set-based approach. This plan applies the same pattern to approval messages.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `src/components/chat/ChatWindow.tsx` | Modify | `cancelableApprovalMessageId` → `cancelableApprovalMessageIds: Set<string>`, cross-stage rollback in `handleCancelApproval` |
| `src/components/chat/MessageBubble.tsx` | Modify | Prop type change, `===` → `.has()` check |

---

## Task 1: Change cancelableApprovalMessageId to Set in ChatWindow.tsx

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`

### Changes:

- [ ] **Step 1: Change the useMemo (line ~1895) from single-ID to Set**

Current code (lines 1895-1912):
```typescript
  const cancelableApprovalMessageId = useMemo(() => {
    if (!paperSession) return null
    const status = paperSession.stageStatus as string
    if (status === "revision") return null
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
  const cancelableApprovalMessageIds = useMemo(() => {
    const ids = new Set<string>()
    if (!paperSession || paperSession.currentStage === "completed") return ids
    const status = paperSession.stageStatus as string
    if (status === "revision") return ids
    // Scan ALL messages — collect ALL [Approved:] synthetics.
    // Cancel must work on any validated stage (ref: choice card pattern, commit 19e7e473).
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.role !== "user") continue
      const textPart = msg.parts?.find((p) => p.type === "text") as { text?: string } | undefined
      const text = textPart?.text ?? ""
      if (text.startsWith("[Approved:")) ids.add(msg.id)
    }
    return ids
  }, [messages, paperSession])
```

- [ ] **Step 2: Add cross-stage rollback to handleCancelApproval (line ~2699)**

Current code (lines 2699-2739):
```typescript
  const handleCancelApproval = useCallback(async (uiMessageId: string, syntheticMessageIndex: number) => {
    if (!userId || !paperSession?._id || !conversationId) return
    cancellingApprovalRef.current = true
    try {
      // 1. Revert Convex state
      await unapproveStage({ sessionId: paperSession._id, userId })
      ...
```

Add cross-stage detection BEFORE the existing unapproveStage call. Insert after `cancellingApprovalRef.current = true` and before `try {`:

Replace the `try` block's first section (before `// 2. Map UIMessage.id`):
```typescript
    try {
      // Detect cross-stage cancel: count [Approved:] messages AFTER the one being cancelled.
      // Each represents a stage that must be reverted first (most recent first).
      const approvalsAfter = messages.slice(syntheticMessageIndex + 1).filter(
        (m) => m.role === "user" && m.parts?.some(
          (p) => p.type === "text" && (p as { text?: string }).text?.startsWith("[Approved:")
        )
      )

      // Revert intermediate approvals (if cross-stage) + the target approval
      const totalUnapprovals = approvalsAfter.length + 1
      for (let j = 0; j < totalUnapprovals; j++) {
        await unapproveStage({ sessionId: paperSession._id, userId })
      }
```

Remove the old `await unapproveStage(...)` line that was there before (the single call).

Update the console.info (line ~2725):
```typescript
      console.info(`[CANCEL-DECISION] approval cancelled, validation panel re-shown${approvalsAfter.length > 0 ? ` (cross-stage rollback, ${approvalsAfter.length} intermediate approval(s) reverted)` : ""}`)
```

- [ ] **Step 3: Update the dep array of handleCancelApproval**

Add `messages` to the dep array (needed for cross-stage detection).

Current (line ~2739):
```typescript
  }, [userId, paperSession?._id, conversationId, historyMessages, unapproveStage, editAndTruncate, setMessages])
```

Change to:
```typescript
  }, [userId, paperSession?._id, conversationId, messages, historyMessages, unapproveStage, editAndTruncate, setMessages])
```

**CRITICAL:** Do NOT change the size or order of ANY other useEffect or useMemo dep array. Only add `messages` to `handleCancelApproval`'s useCallback deps.

- [ ] **Step 4: Update the prop passed to MessageBubble (line ~3181)**

Change:
```typescript
                        cancelableApprovalMessageId={cancelableApprovalMessageId}
```
to:
```typescript
                        cancelableApprovalMessageIds={cancelableApprovalMessageIds}
```

- [ ] **Step 5: Verify TypeScript compiles (will fail until Task 2)**

This step will have type errors because MessageBubble still expects `cancelableApprovalMessageId: string | null`. That's expected — Task 2 fixes it.

- [ ] **Step 6: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "fix(cancel): enable cancel button on all validated stages + cross-stage approval rollback"
```

### CHECKPOINT Task 1
STOP. Dispatch audit agent to verify: Set-based scan collects ALL [Approved:] messages, cross-stage rollback loops unapproveStage N+1 times, dep array updated correctly (only `messages` added), no other dep arrays modified.

---

## Task 2: Update MessageBubble prop type and check

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx`

- [ ] **Step 1: Change prop type (line ~196)**

Change:
```typescript
    /** ID of the single message eligible for approval cancel (computed in ChatWindow) */
    cancelableApprovalMessageId?: string | null
```
to:
```typescript
    /** IDs of messages eligible for approval cancel (computed in ChatWindow) */
    cancelableApprovalMessageIds?: Set<string>
```

- [ ] **Step 2: Update destructured prop (line ~220)**

Change:
```typescript
    cancelableApprovalMessageId,
```
to:
```typescript
    cancelableApprovalMessageIds,
```

- [ ] **Step 3: Update the eligibility check (line ~1284)**

Change:
```typescript
                if (autoAction?.kind === "approved" && onCancelApproval && message.id === cancelableApprovalMessageId) {
```
to:
```typescript
                if (autoAction?.kind === "approved" && onCancelApproval && cancelableApprovalMessageIds?.has(message.id)) {
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -E "error TS" | head -10`
Expected: Zero errors

- [ ] **Step 5: Verify tests pass**

Run: `npx vitest run src/components/chat/layout/ChatLayout.sidebar-tree.test.tsx`
Expected: 4/4 pass

- [ ] **Step 6: Commit**

```bash
git add src/components/chat/MessageBubble.tsx
git commit -m "fix(cancel): update MessageBubble to use Set-based approval cancel eligibility"
```

### CHECKPOINT Task 2
STOP. Dispatch audit agent to verify: prop type is Set<string>, `.has()` check used (not `===`), no other props modified, zero type errors.

---

## What This Does NOT Change

1. **Backend** — `unapproveStage` mutation is unchanged. Cross-stage rollback is achieved by calling it N+1 times in sequence (proven pattern from commit `19e7e473`).
2. **Choice card cancel** — `cancelableChoiceMessageIds` and `handleCancelChoice` are untouched.
3. **Confirmation dialog** — "Batalkan Persetujuan?" dialog in MessageBubble.tsx is unchanged.
4. **Other dep arrays** — ONLY `handleCancelApproval`'s useCallback dep array is modified. No useEffect or useMemo dep arrays touched.
