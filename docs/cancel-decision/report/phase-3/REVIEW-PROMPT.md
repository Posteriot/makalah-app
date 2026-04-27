# Phase 3 Review — Remove Edit+Resend from Synthetic Messages

**Date:** 2026-04-17
**Branch:** `agent-harness`
**Commit:** `153e2ce0`
**Reviewer:** Claude (internal), pending Codex audit

---

## Commit

| Hash | Message |
|------|---------|
| `153e2ce0` | `feat(cancel-decision): remove edit+resend from choice and approved synthetic messages` |

---

## Files Modified

| File | Lines Changed | Summary |
|------|---------------|---------|
| `src/components/chat/MessageBubble.tsx` | +5 / -1 | Add `hideEditForSynthetic` guard in fallback action buttons block |

**Total:** 1 file, +5 / -1

---

## V1 Scope Verification

| Message Type | Edit Icon | Batalkan | Copy | Status |
|---|---|---|---|---|
| `choice` synthetic (cancel prop passed) | Hidden (early return) | Shown | Shown | **PASS** |
| `choice` synthetic (cancel prop absent) | Hidden (`hideEditForSynthetic`) | N/A | Shown | **PASS** |
| `approved` synthetic (cancel prop passed) | Hidden (early return) | Shown (30s throttle) | Shown | **PASS** |
| `approved` synthetic (cancel prop absent) | Hidden (`hideEditForSynthetic`) | N/A | Shown | **PASS** |
| `revision` synthetic | Shown | N/A (V1 deferred) | Shown | **PASS** |
| Regular user message | Shown | N/A | Shown | **PASS** |

### How it works

The action buttons area (lines 1164-1290) has three control flow paths:

1. **Lines 1173-1207:** `choice` + `onCancelChoice` → early return with Batalkan + Copy
2. **Lines 1210-1248:** `approved` + `onCancelApproval` → early return with Batalkan + Copy
3. **Lines 1250-1290:** Fallback — all other messages (revision, regular)
   - Line 1252: `hideEditForSynthetic = autoAction?.kind === "choice" || autoAction?.kind === "approved"`
   - Line 1256: `onEdit && !hideEditForSynthetic` — blocks edit icon for choice/approved even without cancel props

Path 3's guard is defensive: in practice, ChatWindow always passes cancel props, so paths 1-2 handle choice/approved. But if a future caller omits cancel props, the edit icon is still suppressed.

---

## Design Doc Compliance

| Section | Check | Verdict |
|---------|-------|---------|
| 8 (V1 scope) | choice messages: Batalkan only, no edit | **PASS** |
| 8 (V1 scope) | approved messages: Batalkan only (30s throttle), no edit | **PASS** |
| 8 (V1 scope) | revision messages: edit+resend preserved | **PASS** |
| 8 (V1 scope) | regular user messages: edit icon unchanged | **PASS** |
| 6 (unchanged) | `resetStageDataForEditResend` still referenced for non-synthetic edit | **PASS** |

---

## Issues Found

**0 blockers. 0 issues.**

---

## TypeScript Verification

```
$ npx tsc --noEmit
(zero errors)
```

---

## Full Diff

```diff
diff --git a/src/components/chat/MessageBubble.tsx b/src/components/chat/MessageBubble.tsx
index 8a797a0c..d6b5e8e3 100644
--- a/src/components/chat/MessageBubble.tsx
+++ b/src/components/chat/MessageBubble.tsx
@@ -1248,9 +1248,13 @@ export function MessageBubble({
                 }
 
+                // Phase 3: choice + approved synthetics never show edit icon
+                // (Batalkan is the only undo mechanism; revision keeps edit per V1 scope)
+                const hideEditForSynthetic = autoAction?.kind === "choice" || autoAction?.kind === "approved"
+
                 return (
                 <div className="flex flex-col items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity pt-2">
-                    {onEdit && (
+                    {onEdit && !hideEditForSynthetic && (
                         editPermission.allowed ? (
```

---

## FULL IMPLEMENTATION COMPLETE

All 3 phases delivered. Design doc sections covered:

| Section | Topic | Phase |
|---------|-------|-------|
| 4.2 | Cancel Choice Card | Phase 1 |
| 4.3 | Cancel Approval | Phase 2 |
| 5.1 | `cancelChoiceDecision` mutation | Phase 1 |
| 5.2 | `unapproveStage` mutation | Phase 2 |
| 5.3 | `stampDecisionEpoch` mutation | Phase 1 |
| 5.5.1 | Two-set `submittedChoiceKeys` | Phase 1 |
| 5.5.2 | `optimisticPendingValidation` clear | Phase 1 |
| 5.5.3 | Harness run guard (30s throttle) | Phase 2 |
| 5.5.4 | `decisionEpoch` chain-completion guard | Phase 1 |
| 6 | Unchanged components verified | Phase 3 |
| 7 | Relationship to existing features | All |
| 8 | V1 scope (revision keeps edit) | Phase 3 |

---

## Codex Audit Prompt

Codex, review Phase 3 (final phase) of the "Cancel Decision" feature.

**Scope:** A single 5-line change in `MessageBubble.tsx` that adds a `hideEditForSynthetic` guard to suppress the edit icon for `choice` and `approved` synthetic messages in the fallback path.

**Focus areas:**

1. **Edit icon suppression** — Is the guard correct? Does `autoAction?.kind === "choice" || autoAction?.kind === "approved"` cover all cases?

2. **Revision messages** — Does `kind: "revision"` still fall through to the edit icon? (Should: V1 intentional per design doc section 8)

3. **Regular user messages** — Is edit icon still shown? (Should: `autoAction` is null for non-synthetic messages)

4. **No regressions** — Is `resetStageDataForEditResend` still referenced in the codebase? (Should: still used for regular edit+resend)

5. **Full V1 coverage** — Cross-reference against all design doc sections listed above. Any gaps?

The full diff is 5 lines. See above.
