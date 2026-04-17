# E2E Test Handoff — Claude Session Continuation

**Date:** 2026-04-18
**Branch:** `agent-harness`
**HEAD:** `966c85e0`
**Pushed:** Yes, to `origin/agent-harness`

---

## What was completed this session

### Stage 1: Gagasan (round 1) — FIXED + APPROVED by Codex

**Bug:** Search-turn fallback choice card not visible in live UI (only after refresh).

**Root cause:** Fallback choice spec persisted to DB but never emitted to live stream. Client missed `SPEC_DATA_PART_TYPE` chunk.

**Fix commits:**
- `cef6725e` — `maybeEmitGuaranteedChoiceSpec` in orchestrator + incremental rehydration in ChatWindow + persist `uiMessageId` on search path

**Key files:**
- `src/lib/ai/web-search/orchestrator.ts` — `maybeEmitGuaranteedChoiceSpec()` exported helper
- `src/lib/ai/web-search/types.ts` — `compileGuaranteedChoiceSpec` config + `messageId` result
- `src/lib/chat-harness/context/execute-web-search-path.ts` — provide callback + use `result.messageId`
- `src/components/chat/ChatWindow.tsx` — incremental choice-spec rehydration useEffect
- Test: `orchestrator.guaranteed-choice.test.ts` (6 tests)

### Stage 2: Topik (round 1) — FIXED + APPROVED by Codex

**Bug 1: Artifact + validation panel appeared simultaneously with response text.**

Root cause: Model calls tools before text. Double rAF (~32ms) imperceptible for short text.

**Fix architecture (cross-stage, not topik-only):**
- `artifactRevealDone` state gates validation panel until artifact reveal completes
- `isValidationPanelEligible()` exported production helper used in render gate + test
- Artifact reveal: `setTimeout(350ms)` after `onFinish` (visual separation)
- In-message artifact card: gated on `!persistProcessIndicators` (hidden during streaming)
- `[UI-REVEAL-ORDER]` observability: `response_settled → artifact_revealed → validation_panel_eligible`

**Fix commits:** `4107b345`, `9aa65ee9`, `6ed0200d`, `ceed6194`, `ed7296ce`

**Bug 2: Cancel-choice then resubmit required browser refresh.**

Root cause (3 layers):
1. `localSubmitted` one-way latch in `JsonRendererChoiceBlock` never reset → `121d913a`
2. Full-derive `useEffect` re-added cancelled choice keys from stale `historyMessages` → `6deb2c65`
3. `isSubmitted` prop stale in `useMemo` handler closure after async cancel → `71810639` (USE REF PATTERN — see memory `feedback_stale_prop_in_handler.md`)

**Key architecture:**
- `JsonRendererChoiceBlock.tsx`: submit handler reads `isSubmittedRef.current` (ref, always fresh)
- `ChatWindow.tsx`: `cancelledChoiceMessageIdsRef` bypasses full-derive race
- Render gate: `submittedChoiceKeys.has(key) && !cancelledChoiceMessageIdsRef.current.has(message.id)`

---

## What remains

### E2E testing — stages 3 through 14

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

1. **User** — manual UI testing per stage, captures logs + screenshots
2. **Codex** — audits evidence, writes audit prompt with findings
3. **Claude** — verifies findings, implements fixes, writes execution report

**Prompt exchange folder:** `docs/agent-harness/e2e-test/audit-and-respond-prompt/`

### Key references

- `docs/agent-harness/new/OBSERVABILITY-MAP.md` — authoritative log map (updated this session)
- `screenshots/test-e2e/HANDOFF.md` — Codex's handoff version (may differ)

### System prompt / skills

- Source: `.references/system-prompt-skills-active/updated-6`
- Changes: `.references/system-prompt-skills-active/updated-7`
- Deploy dev: `wary-ferret-59` via `script/`
- Deploy prod: `basic-oriole-337` after all e2e complete

### Cleanup TODO (after all e2e complete)

1. Remove `[CHOICE-GATE]` diagnostic IIFE from ChatWindow render (temporary debug logging)
2. Deploy system prompt + stage skills to prod DB
3. Push branch + PR to main

---

## Critical patterns learned this session (read memory)

- `feedback_stale_prop_in_handler.md` — useRef for fresh prop in async handlers
- `feedback_browser_console_log_format.md` — template literals, never Objects
- `feedback_skip_full_test_suite.md` — only run relevant tests
- `feedback_no_revert_roulette.md` — diagnose first, never blind revert

---

## How to start the next session

1. Read this handoff
2. Read `OBSERVABILITY-MAP.md`
3. Read `MEMORY.md` — especially feedback entries
4. User will provide next stage test evidence
5. Continue 3-party workflow
