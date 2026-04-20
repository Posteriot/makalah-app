# Phase 1 Patch Report — Round 1

> **For Codex:** Review this patch against the original audit findings in `phase-1-review-round-1.md`.
> Design source of truth: `docs/cancel-decision/design.md`
> Patch commit range: from HEAD of `phase-1-review-round-1.md` findings to current HEAD.

---

## Patch Summary

Two critical findings from Codex audit round 1 were addressed. No other files were touched. No scope expansion.

---

## Finding 1: Cancel eligibility — Batalkan exposed on all choice synthetics

### Root cause

`MessageBubble.tsx` rendered Batalkan for every `autoAction?.kind === "choice"` without verifying the message is the latest cancelable choice. Clicking Batalkan on a historical choice would revert the **current** stage instead of the stage that choice belonged to.

### What changed

| File | Location | Change |
|------|----------|--------|
| `ChatWindow.tsx` | Lines 1694-1709 | New `cancelableChoiceMessageId` useMemo |
| `ChatWindow.tsx` | Line 2888 | Pass `cancelableChoiceMessageId` prop to MessageBubble |
| `MessageBubble.tsx` | Line 183 (props) | New `cancelableChoiceMessageId?: string \| null` prop |
| `MessageBubble.tsx` | Line 205 (destructure) | Destructure new prop |
| `MessageBubble.tsx` | Line 1175 | Gate: `message.id === cancelableChoiceMessageId` added to Batalkan condition |

### How `cancelableChoiceMessageId` works

```typescript
const cancelableChoiceMessageId = useMemo(() => {
  if (!paperSession || paperSession.currentStage === "completed") return null
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role !== "user") continue
    const textPart = msg.parts?.find((p) => p.type === "text") as { text?: string } | undefined
    const text = textPart?.text ?? ""
    if (text.startsWith("[Approved:")) return null
    if (text.startsWith("[Choice:")) return msg.id
  }
  return null
}, [messages, paperSession])
```

**Logic:** Scan `messages` backward. If `[Approved:]` is encountered before any `[Choice:]`, no choice is cancelable (the latest choice was already approved). If `[Choice:]` is encountered first, that message is the single cancelable target.

**Why this covers all cases:**
- Historical choices from previous stages always have `[Approved:]` after them (that's how stages advance). The backward scan hits the approval first and returns null before reaching the old choice.
- The latest choice in the current stage has no approval after it — it's returned as cancelable.
- `currentStage === "completed"` returns null (nothing to cancel).

**Why `messages` (UIMessage[]) not `historyMessages` (Convex[]):**
- `messages` is always current (includes optimistic local messages before Convex persistence).
- `historyMessages` may lag behind during the transition between choice submission and Convex persistence. However, during that transition the streaming guard (`!isStreaming`) already hides Batalkan.
- Using `messages` also means `msg.id` directly matches what MessageBubble receives as `message.id`, eliminating identity mapping issues.

### What did NOT change

- `hideEditForSynthetic` (MessageBubble line 1255) still applies to ALL choice/approved synthetics regardless of cancel eligibility. Edit icon is hidden on historical choices even though Batalkan is not shown.
- `handleCancelChoice` handler logic is unchanged — it still operates on the current stage. The eligibility gate ensures it's only invokable for the correct message.

---

## Finding 2: Submitted-choice key inconsistency between live and persisted IDs

### Root cause

Three code paths each used a different identifier to construct submission keys:

| Code path | Key constructed with | Identifier source |
|-----------|---------------------|-------------------|
| `handleChoiceSubmit` (optimistic) | `message.id` (live AI SDK ID) | MessageBubble passes `message.id` as `sourceMessageId` |
| Rehydration useEffect (persisted) | `prev._id` (Convex ID) | historyMessages Convex documents |
| `isChoiceSubmitted` check | `message.id` | UIMessage — equals live ID during session, equals `_id` after hydration (line 1552: `id: msg._id`) |

The cancel handler removed only the `_id` variant. The optimistic key (live ID) survived, keeping the card stuck in submitted state after cancel.

The migration from optimistic to persisted never matched because `keys.has(liveIdKey)` was checked against a set containing only `_id`-based keys.

### What changed

| File | Location | Change |
|------|----------|--------|
| `ChatWindow.tsx` | Lines 1670-1676 (rehydration) | Add both `_id` AND `uiMessageId` key variants to `persistedChoiceKeys` |
| `ChatWindow.tsx` | Lines 2417-2427 (cancel) | Remove both `_id` AND `uiMessageId` key variants from both sets |

### Rehydration fix detail

```typescript
// _id variant (used after history hydration where message.id = _id)
keys.add(`${prev._id}::${prev._id}-choice-spec`)
// uiMessageId variant (used during live session where message.id = AI SDK id)
const uiId = (prev as any).uiMessageId as string | undefined
if (uiId && uiId !== String(prev._id)) {
  keys.add(`${uiId}::${uiId}-choice-spec`)
}
```

**Effect on migration:** The optimistic key `LIVE_ID::LIVE_ID-choice-spec` now matches the `uiMessageId` variant in `persistedChoiceKeys`, so `keys.has(key)` returns true and the optimistic key is properly cleaned up.

### Cancel fix detail

```typescript
const idKey = `${prev._id}::${prev._id}-choice-spec`
const uiId = (prev as any).uiMessageId as string | undefined
const uiKey = uiId && uiId !== String(prev._id) ? `${uiId}::${uiId}-choice-spec` : null
setPersistedChoiceKeys((p) => {
  const n = new Set(p); n.delete(idKey); if (uiKey) n.delete(uiKey); return n
})
setOptimisticPendingKeys((p) => {
  const n = new Set(p); n.delete(idKey); if (uiKey) n.delete(uiKey); return n
})
```

### Why no shared helper function was extracted

The audit suggested a shared helper. The actual key construction is 3 lines (compute `idKey`, compute `uiKey`, guard on `uiId !== _id`). It appears in exactly 2 places (rehydration + cancel). Extracting a helper would add indirection for a pattern that's self-documenting inline. If a third call site appears, extraction would be warranted.

### What did NOT change

- `handleChoiceSubmit` still stores only the live ID variant in `optimisticPendingKeys`. This is correct — the live ID is what `isChoiceSubmitted` will check against during the optimistic window.
- The `isChoiceSubmitted` check at line 2888 (`submittedChoiceKeys.has(...)`) is unchanged. The combined `submittedChoiceKeys` set (useMemo union of persisted + optimistic) now contains the right variant for whatever `message.id` is at render time.

---

## Verification Evidence

### TypeScript compilation

```
$ npx tsc --noEmit
(zero errors)
```

### Scenario traces (code-level, not runtime)

**S1: Historical [Choice:] message does not show Batalkan**

Message sequence: `[Choice: gagasan]` → assistant → `[Approved: Gagasan]` → assistant → `[Choice: topik]`

`cancelableChoiceMessageId` backward scan: hits `[Choice: topik]` at i=4 → returns `messages[4].id`. MessageBubble for `messages[0]` (`[Choice: gagasan]`): `message.id !== cancelableChoiceMessageId` → Batalkan not rendered.

**S2: Cancel reactivates choice card without refresh**

Before cancel: optimistic key `LIVE_ID::...` stored on submit. Rehydration adds `LIVE_ID::...` (via uiMessageId) to persisted. Migration removes optimistic. Cancel removes `LIVE_ID::...` from persisted. `submittedChoiceKeys.has(LIVE_ID::...)` → false → card interactive.

**S3: Card shows submitted after refresh**

Messages hydrated with `id: msg._id = CONVEX_ID`. Rehydration adds `CONVEX_ID::...` to persisted. Check: `submittedChoiceKeys.has(CONVEX_ID::...)` → true → card submitted.

**S4: Cancel removes synthetic + reactivates card**

`cancelChoiceDecision` reverts Convex state. `editAndTruncateConversation` deletes synthetic + subsequent. `setMessages(prev.slice(0, idx))` truncates local. Both key variants removed from both sets. `optimisticPendingValidation` cleared. Card renders from unchanged `jsonRendererChoice` spec → interactive.

---

## Remaining Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Choice followed by revision(s) then cancel | Low | Backward scan returns the [Choice:] as cancelable even if [Revisi:] messages exist after it. Cancel deletes the choice + all revisions, reverting to the choice card. This is valid behavior per design doc 4.2 but could surprise users after multiple revisions. V1 scope limitation. |
| `cancelableChoiceMessageId` is null during the brief window between choice submission and Convex persistence | None | Streaming guard already hides Batalkan during this window. Once status="ready" and historyMessages updates, the eligibility is correct. |

---

## Files changed (final)

```
src/components/chat/ChatWindow.tsx   — cancelableChoiceMessageId, rehydration dual-key, cancel dual-key removal, prop pass
src/components/chat/MessageBubble.tsx — cancelableChoiceMessageId prop + eligibility gate
```

---

## Review Checklist for Codex

1. [ ] `cancelableChoiceMessageId` correctly returns null when latest synthetic is `[Approved:]`
2. [ ] `cancelableChoiceMessageId` correctly returns null when `currentStage === "completed"`
3. [ ] `cancelableChoiceMessageId` returns the latest `[Choice:]` message ID when no approval follows
4. [ ] Rehydration adds both `_id` and `uiMessageId` key variants
5. [ ] Cancel removes both `_id` and `uiMessageId` key variants from both sets
6. [ ] Optimistic migration now cleans up live-ID keys that match persisted uiMessageId variants
7. [ ] `hideEditForSynthetic` still hides edit icon on ALL choice/approved synthetics (not gated on cancelability)
8. [ ] No scope expansion into approval/revision/epoch work
9. [ ] TypeScript compiles clean

---

## Update Log

| Round | Date | Findings addressed | Status |
|-------|------|-------------------|--------|
| Round 1 | 2026-04-18 | Finding 1 (eligibility) + Finding 2 (key normalization) | Awaiting Codex review |
