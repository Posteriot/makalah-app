# Phase 1 Patch Report — Round 2

> **For Codex:** Review this patch against the blocking finding in round 2.
> Design source of truth: `docs/cancel-decision/design.md`
> Previous patch report: `phase-1-patch-round-1-report.md`

---

## Patch Summary

One blocking finding: choice cancel was still exposed when `[Revisi untuk ...]` messages existed after the `[Choice:]`. Fixed by adding revision as a boundary in the backward scan.

---

## Finding: Choice cancel exposed during revision flow

### Root cause

`cancelableChoiceMessageId` backward scan only treated `[Approved:]` as a hard stop. `[Revisi untuk ...]` was ignored, so after a user requested revision, the old `[Choice:]` still appeared cancelable.

### What changed

| File | Location | Change |
|------|----------|--------|
| `ChatWindow.tsx` | Line 1706 | Added `if (text.startsWith("[Revisi untuk")) return null` |
| `ChatWindow.tsx` | Lines 1695-1696, 1699 | Updated comments to document the new boundary |

### The fix (1 line of logic)

```typescript
if (text.startsWith("[Approved:")) return null
if (text.startsWith("[Revisi untuk")) return null  // <-- added
if (text.startsWith("[Choice:")) return msg.id
```

### Why this is sufficient for Phase 1

Phase 1 scope is choice cancel only. The design doc (section 4.4) explicitly defers revision cancel to post-V1. Once a revision has been requested:
- The model is generating revised content
- `stageData` may already contain revision artifacts
- `cancelChoiceDecision` only handles `pending_validation -> drafting`, not revision rollback

Treating `[Revisi untuk]` as a boundary makes the choice non-cancelable once the user has moved into revision flow. This is the correct Phase 1 behavior.

### Format verification

Revision synthetic is emitted at `ChatWindow.tsx:2378`:
```typescript
sendMessageWithPendingIndicator(`[Revisi untuk ${stageLabel}]\n\n${feedback}`)
```

The boundary check `text.startsWith("[Revisi untuk")` matches this format. The prefix is stable — it's a hardcoded template, not user-editable text.

---

## Verification Evidence

### TypeScript compilation

```
$ npx tsc --noEmit
(zero errors)
```

### Scenario traces

**S1: `[Revisi untuk ...]` exists after `[Choice:]` — no Batalkan shown**

Message sequence:
```
messages[0]: assistant — choice card
messages[1]: user — "[Choice: gagasan]\nPilihan: fokus-x"
messages[2]: assistant — creates artifact, validation panel
messages[3]: user — "[Revisi untuk Gagasan Paper]\n\nTolong perbaiki X"
messages[4]: assistant — revised artifact
```

Backward scan from i=4:
- i=4: role=assistant → skip
- i=3: role=user, text="[Revisi untuk Gagasan Paper]..." → starts with "[Revisi untuk" → **return null**
- messages[1] never reached

Result: `cancelableChoiceMessageId = null` → no Batalkan on messages[1] or any message.

**S2: Normal `[Choice:]` with no revision/approval — Batalkan shown**

Message sequence:
```
messages[0]: assistant — choice card
messages[1]: user — "[Choice: topik]\nPilihan: topik-y"
messages[2]: assistant — creates artifact, validation panel
```

Backward scan from i=2:
- i=2: role=assistant → skip
- i=1: role=user, text="[Choice: topik]..." → starts with "[Choice:" → **return messages[1].id**

Result: `cancelableChoiceMessageId = messages[1].id` → Batalkan shown on messages[1].

**S3: Historical choice from previous approved stage — no Batalkan**

Message sequence:
```
messages[0]: assistant — gagasan choice card
messages[1]: user — "[Choice: gagasan]..."
messages[2]: assistant — artifact
messages[3]: user — "[Approved: Gagasan Paper]"
messages[4]: assistant — topik discussion
messages[5]: user — "[Choice: topik]..."
```

Backward scan from i=5:
- i=5: role=user, text="[Choice: topik]" → **return messages[5].id**

messages[1] never gets Batalkan because only messages[5].id matches `cancelableChoiceMessageId`.

---

## Files Changed

```
src/components/chat/ChatWindow.tsx — 1 line of logic + comment updates
```

---

## Remaining Risks

None new. The three boundaries (`[Approved:]`, `[Revisi untuk]`, `completed`) fully cover Phase 1 scope. Revision cancel remains deferred per design doc section 4.4.

---

## Update Log

| Round | Date | Finding | Status |
|-------|------|---------|--------|
| Round 1 | 2026-04-18 | Eligibility + key normalization | Fixed, accepted by Codex |
| Round 2 | 2026-04-18 | Revision boundary missing | Fixed, awaiting Codex review |
