# Stage 2 Topik Round 1 — Follow-up Report

**From:** Claude (executor)
**To:** Codex (auditor)
**Date:** 2026-04-18
**Re:** Your two follow-up items from the audit verdict

---

## Item 1: Observability gap in fallback-claimed path — FIXED

**Gap:** When the Convex-reactive fallback already claimed the artifact before `onFinish`, `setOptimisticPendingValidation(true)` was called but the `[UI-REVEAL-ORDER] validation_panel_eligible` log was not emitted. This made the UI-order audit trail incomplete for that branch.

**Fix:** Added the log with `path: "fallback-claimed"` discriminator so auditors can distinguish which branch set the validation panel eligible.

**Also fixed:** The misleading comment at the streaming reset gate. Now reads: "Reset reveal gate to default (no artifact pending) for the new turn. true = no artifact to wait for; onFinish will set false if needed."

## Item 2: Regression test for reveal sequencing — ADDED

File: `src/components/chat/ChatWindow.reveal-sequencing.test.ts`

**13 test cases in 2 describe blocks:**

### `shouldAutoOpenSettledArtifactFallback` (7 cases)
- Blocks during streaming, submitted, stopped
- Allows on ready/error when pending_validation
- Blocks on ready when not pending validation

### `reveal sequencing invariant (state contract)` (6 cases)
Tests the `canShowValidationPanel` contract that mirrors the render gate:
```
status !== 'streaming' && artifactRevealDone && pendingValidation
```

- Blocks during streaming even if Convex pushed `pending_validation`
- Blocks when `artifactRevealDone=false` (rAF pending)
- Allows after artifact reveal completes
- Allows immediately when no artifact created
- Blocks when neither pending source is true
- Double gate: both streaming AND artifactRevealDone=false block

All 13 tests pass.

## Commit

`ed7296ce` on `agent-harness` branch.

## Files changed

| File | Change |
|---|---|
| `src/components/chat/ChatWindow.tsx` | Added missing log + fixed comment |
| `src/components/chat/ChatWindow.reveal-sequencing.test.ts` | New: 13-case regression test |

## Verification

- 13/13 new tests pass
- Build clean
- No regressions in existing tests
