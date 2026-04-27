# Phase 2 Patch Report — Round 1

> **For Codex:** Review this patch against the audit finding for Phase 2.
> Design source of truth: `docs/cancel-decision/design.md` sections 4.3, 5.2, 5.5.3

---

## Patch Summary

One blocking finding: Batalkan for approved synthetics was exposed on ALL `[Approved:]` messages, not just the one for the current previous stage. Fixed by computing `cancelableApprovalMessageId` in ChatWindow using session state + message position.

---

## Finding: Approval cancel exposed too broadly

### Root cause

`MessageBubble.tsx` rendered the approval Batalkan for every `autoAction?.kind === "approved"` with only streaming + throttle guards. No check that the message corresponds to the stage exactly one step behind the current session stage.

Since `unapproveStage` derives `targetStage` from session state (not from the clicked message), clicking Batalkan on a historical `[Approved: Gagasan Paper]` while in stage `metode` would revert `topik` — the wrong stage.

### What changed

| File | Location | Change |
|------|----------|--------|
| `ChatWindow.tsx` | Lines 1712-1727 | New `cancelableApprovalMessageId` useMemo |
| `ChatWindow.tsx` | Line 2920 | Pass `cancelableApprovalMessageId` prop to MessageBubble |
| `MessageBubble.tsx` | Line 184 (props) | New `cancelableApprovalMessageId?: string \| null` prop |
| `MessageBubble.tsx` | Line 207 (destructure) | Destructure new prop |
| `MessageBubble.tsx` | Line 1215 | Gate: `message.id === cancelableApprovalMessageId` added to approval Batalkan condition |

### How `cancelableApprovalMessageId` works

```typescript
const cancelableApprovalMessageId = useMemo(() => {
  if (!paperSession) return null
  const isNormalApproval = paperSession.stageStatus === "drafting"
  const isFinalApproval = paperSession.currentStage === "completed" && paperSession.stageStatus === "approved"
  if (!isNormalApproval && !isFinalApproval) return null
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

**Two-layer guard:**

1. **Session state gate** — mirrors the backend `unapproveStage` guard exactly:
   - `stageStatus === "drafting"` (normal: stage just advanced, new stage is drafting)
   - `currentStage === "completed" && stageStatus === "approved"` (final: judul approved, session completed)
   - Any other state (e.g. `pending_validation`, `streaming`) → null → no Batalkan shown

2. **Latest [Approved:] scan** — backward scan returns only the most recent `[Approved:]` message. By construction, approvals happen in stage order, so the latest one always corresponds to the current previous stage.

**Why this doesn't parse stage labels from message text:**
- The audit explicitly warned against "brittle display-text assumptions"
- `unapproveStage` derives `targetStage` from `getPreviousStage(currentStage)`, not from message text
- The UI only needs to ensure the latest `[Approved:]` matches what the backend will operate on — the session state gate guarantees this

**Why no [Choice:] or [Revisi:] boundary is needed:**
- If the user has submitted a choice for the new stage, `stageStatus` transitions away from `"drafting"` (to `"pending_validation"` after chain-completion), and the session state gate returns null
- If somehow stageStatus is still `"drafting"` with a [Choice:] after the approval, the backend's `validatedAt` guard provides the final safety net

### What did NOT change

- `hideEditForSynthetic` (line 1257) still applies to ALL approved synthetics regardless of cancelability
- The 30-second throttle and streaming guard inside MessageBubble remain — they add UX-level defense on top of the eligibility gate
- `handleCancelApproval` handler logic is unchanged
- Backend `unapproveStage` mutation is unchanged
- The boundary mismatch warning at `paperSessions.ts:912` is a non-destructive log — it warns and skips boundary removal but still proceeds. This is correct behavior: a mismatch means the boundary data is inconsistent, and skipping removal is the safe default

---

## Verification Evidence

### TypeScript compilation

```
$ npx tsc --noEmit
(zero errors)
```

### Scenario traces

**S1: Historical `[Approved: Gagasan Paper]` — no Batalkan when session is in stage `metode`**

Session state: `currentStage = "metode"`, `stageStatus = "drafting"`

Message sequence:
```
messages[0]: assistant — gagasan discussion
messages[1]: user — "[Choice: gagasan]..."
messages[2]: assistant — artifact
messages[3]: user — "[Approved: Gagasan Paper]"    ← historical
messages[4]: assistant — topik discussion
messages[5]: user — "[Choice: topik]..."
messages[6]: assistant — artifact
messages[7]: user — "[Approved: Topik Paper]"      ← latest approval
messages[8]: assistant — metode discussion (current stage)
```

Session state gate: `stageStatus === "drafting"` → passes.
Backward scan: hits messages[7] `[Approved: Topik Paper]` → returns `messages[7].id`.

MessageBubble for messages[3]: `message.id !== cancelableApprovalMessageId` → Batalkan NOT rendered.
MessageBubble for messages[7]: `message.id === cancelableApprovalMessageId` → Batalkan rendered (subject to throttle).

**S2: Current previous-stage approval shows Batalkan after throttle**

Session state: `currentStage = "topik"`, `stageStatus = "drafting"`
Latest `[Approved:]` is messages[3] for gagasan (30+ seconds old).

Gate: `stageStatus === "drafting"` → passes.
Scan: latest `[Approved:]` = messages[3] → `cancelableApprovalMessageId = messages[3].id`.
Throttle: `Date.now() - createdAt > 30_000` → not throttled.
Result: Batalkan shown.

**S3: `currentStage === "completed"` allows unapproving judul**

Session state: `currentStage = "completed"`, `stageStatus = "approved"`

Gate: `isFinalApproval = true` → passes.
Scan: latest `[Approved:]` is the judul approval → returned.
Result: Batalkan shown for judul approval only.

**S4: Session in `pending_validation` — no approval Batalkan**

Session state: `currentStage = "topik"`, `stageStatus = "pending_validation"` (user submitted choice, artifact created)

Gate: `isNormalApproval = false`, `isFinalApproval = false` → returns null.
Result: no Batalkan on any approved message. Correct — user is mid-stage, not in a state to unapprove the previous stage.

---

## Secondary concern: boundary mismatch warning

`convex/paperSessions.ts:907-913` — the boundary mismatch warning logs and skips removal but proceeds with the rest of unapproval. This is the correct behavior:
- Boundary data is metadata for UI grouping, not a correctness invariant
- Skipping removal on mismatch is non-destructive (keeps stale boundary rather than removing wrong one)
- The warning provides observability for debugging
- No backend change needed

---

## Files Changed

```
src/components/chat/ChatWindow.tsx   — cancelableApprovalMessageId useMemo + prop pass
src/components/chat/MessageBubble.tsx — cancelableApprovalMessageId prop + eligibility gate
```

---

## Remaining Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Session state gate relies on Convex subscription being current | Low | If `paperSession` subscription lags, the gate might show Batalkan briefly in a stale state. The backend guard is the final safety net and will throw. |

---

## Update Log

| Round | Date | Finding | Status |
|-------|------|---------|--------|
| Round 1 | 2026-04-18 | Approval eligibility too broad | Fixed, awaiting Codex review |
