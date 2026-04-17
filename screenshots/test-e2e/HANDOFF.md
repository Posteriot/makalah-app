# E2E Test Handoff — Session Continuation

**Date:** 2026-04-18
**Branch:** `agent-harness`
**HEAD:** `71810639`
**Pushed:** Yes, to `origin/agent-harness`

---

## What was completed this session

### Stage 1: Gagasan (round 1) — FIXED + APPROVED by Codex

**Bug:** Search-turn fallback choice card not visible in live UI (only after refresh).

**Fix commits:**
- `cef6725e` — Emit fallback `SPEC_DATA_PART_TYPE` to live stream via `maybeEmitGuaranteedChoiceSpec` + incremental rehydration in ChatWindow + persist `uiMessageId` on search path
- Regression test: `orchestrator.guaranteed-choice.test.ts` (6 tests)

**Files changed:**
- `src/lib/ai/web-search/orchestrator.ts` — `maybeEmitGuaranteedChoiceSpec` helper
- `src/lib/ai/web-search/types.ts` — `compileGuaranteedChoiceSpec` config + `messageId` result
- `src/lib/chat-harness/context/execute-web-search-path.ts` — provide callback + use `result.messageId`
- `src/components/chat/ChatWindow.tsx` — incremental choice-spec rehydration useEffect

### Stage 2: Topik (round 1) — FIXED + APPROVED by Codex

**Bug 1:** Artifact + validation panel appeared simultaneously with response text (no visual sequencing).

**Fix commits:**
- `4107b345` — State-driven reveal sequencing: `artifactRevealDone` gates validation panel
- `9aa65ee9` — Increase artifact reveal delay from ~32ms rAF to 350ms setTimeout
- `6ed0200d` — Defer in-message artifact card until text finishes streaming (`!persistProcessIndicators`)
- `ceed6194` — Extract `isValidationPanelEligible` as production helper
- `ed7296ce` — Regression test: `ChatWindow.reveal-sequencing.test.ts` (13 tests)

**Key architecture:**
- `artifactRevealDone` state: `false` during reveal, `true` after → gates validation panel
- `isValidationPanelEligible()`: exported helper used in both render gate and test
- `[UI-REVEAL-ORDER]` observability: `response_settled → artifact_revealed → validation_panel_eligible`
- In-message artifact card gated on `!persistProcessIndicators` (hidden during streaming)

**Bug 2:** Cancel-choice then resubmit required browser refresh.

**Fix commits:**
- `121d913a` — Reset `localSubmitted` latch via useEffect when `isSubmitted` transitions to false
- `6deb2c65` — `cancelledChoiceMessageIdsRef` prevents full-derive from re-adding cancelled choice keys
- `71810639` — Use `isSubmittedRef` (ref) in submit handler to avoid stale prop closure

**Key architecture:**
- `JsonRendererChoiceBlock.tsx`: submit handler reads `isSubmittedRef.current` (always fresh) instead of prop closure (stale after async cancel)
- `ChatWindow.tsx`: `cancelledChoiceMessageIdsRef` bypasses full-derive race where `historyMessages` hasn't synced after `editAndTruncate`
- Render gate: `isChoiceSubmitted = submittedChoiceKeys.has(key) && !cancelledChoiceMessageIdsRef.current.has(message.id)`

---

## What remains

### E2E testing — stages 3 through 14

The following stages have NOT been tested yet:

| # | Stage | Status |
|---|---|---|
| 3 | outline | Not tested |
| 4 | pendahuluan | Not tested |
| 5 | tinjauan-pustaka | Not tested |
| 6 | metodologi | Not tested |
| 7 | hasil | Not tested |
| 8 | pembahasan | Not tested |
| 9 | kesimpulan | Not tested |
| 10 | abstrak | Not tested |
| 11 | judul | Not tested |
| 12 | lampiran | Not tested |
| 13 | daftar-pustaka | Not tested |
| 14 | completed | Not tested |

### Test workflow (3-party)

1. **User** — manual UI testing per stage, captures terminal logs + browser console + screenshots
2. **Codex** — audits evidence against `OBSERVABILITY-MAP.md`, writes audit prompt with findings
3. **Claude** — verifies findings against codebase, implements fixes, writes execution report

**Prompt exchange folder:** `docs/agent-harness/e2e-test/audit-and-respond-prompt/`

### Observability reference

`docs/agent-harness/new/OBSERVABILITY-MAP.md` — updated this session with:
- `[CHOICE-CARD][guaranteed][stream]` (search fallback)
- `[UI-REVEAL-ORDER]` (reveal sequencing: response_settled, artifact_revealed, validation_panel_eligible)
- `[CHOICE-GATE]` (diagnostic — can be removed after e2e complete)
- `[CHOICE-CARD] submitChoice blocked` / `localSubmitted reset` (cancel-resubmit debugging)

### System prompt / skills

- Source of truth: `.references/system-prompt-skills-active/updated-6`
- Changes go to: `.references/system-prompt-skills-active/updated-7`
- Deploy to dev: `wary-ferret-59` via scripts in `script/`
- Deploy to prod: `basic-oriole-337` after all e2e complete

### Cleanup TODO (after all e2e complete)

1. Remove `[CHOICE-GATE]` diagnostic IIFE from ChatWindow render (temporary debug logging)
2. Deploy system prompt + stage skills to prod DB
3. Push branch + PR to main

---

## How to start the next session

1. Read this handoff first
2. Read `OBSERVABILITY-MAP.md` for log reference
3. Read memory at `MEMORY.md` — especially feedback entries
4. User will provide stage 3 (outline) test evidence
5. Continue the 3-party workflow
