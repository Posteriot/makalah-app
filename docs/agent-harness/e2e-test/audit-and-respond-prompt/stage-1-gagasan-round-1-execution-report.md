# Stage 1 Gagasan Round 1 — Execution Report

**From:** Claude (executor)
**To:** Codex (auditor)
**Date:** 2026-04-18
**Status:** Fix implemented, all tests pass, build clean

---

## Root Cause (Verified)

The search-turn deterministic fallback choice card was generated and persisted to DB but **never emitted to the live client stream**. The gap:

1. The search orchestrator (`orchestrator.ts`) processes the compose stream and captures `SPEC_DATA_PART_TYPE` chunks — but only IF the compose model emits a YAML choice card. The compose model did NOT emit one (search responses often skip it).

2. `execute-web-search-path.ts` compiled a deterministic fallback choice spec in its `onFinish` callback, but `onFinish` runs AFTER the stream is already closing. The fallback was persisted to DB via `saveAssistantMessage(... jsonRendererChoice: searchChoiceSpec ...)` but never written to the stream as a `SPEC_DATA_PART_TYPE` chunk.

3. `ChatWindow.tsx` rehydrates `jsonRendererChoice` from persisted history into `useChat` state — but only during the one-shot `syncedConversationRef` sync on conversation mount. The search fallback arrives in DB after this sync already completed → client misses it.

4. Additionally, `uiMessageId: undefined` was hardcoded on the search path, making live-to-persisted message matching impossible for incremental updates.

**Result:** No choice card in live UI. Card only appeared after full page refresh.

---

## Fix: 3-Part Durability Package

### Part 1: Stream-side fallback emission (orchestrator.ts + types.ts)

**Files changed:**
- `src/lib/ai/web-search/types.ts` — Added `compileGuaranteedChoiceSpec` callback to `WebSearchOrchestratorConfig`. Added `messageId` to `WebSearchResult`.
- `src/lib/ai/web-search/orchestrator.ts` — In the finish handler, AFTER compose finishes and choice spec capture is logged, BEFORE `onFinish` is called: if no valid `capturedChoiceSpec?.root` exists and `config.compileGuaranteedChoiceSpec` is provided, call it. Emit the fallback as `SPEC_DATA_PART_TYPE` to the writer. Set `capturedChoiceSpec` to the fallback. Log `[CHOICE-CARD][guaranteed][stream]`. Also pass `messageId` through the `onFinish` result.

**Why this works:** The fallback spec reaches the client as a live stream chunk DURING the active response. `MessageBubble` receives `SPEC_DATA_PART_TYPE` in `message.parts` and renders the choice card immediately — no page refresh needed.

**Log tag added:** `[CHOICE-CARD][guaranteed][stream] stage=<stage> source=deterministic-fallback`

### Part 2: Search path wiring (execute-web-search-path.ts)

**File changed:** `src/lib/chat-harness/context/execute-web-search-path.ts`

Changes:
1. **Provided `compileGuaranteedChoiceSpec` callback** in the orchestrator config — only when `paperStageScope && paperSession?.stageStatus === "drafting"`. Uses the same `compileChoiceSpec()` contract that was already in `onFinish`.
2. **Simplified `onFinish` fallback logic** — removed redundant fallback compilation from `onFinish` since the orchestrator now handles it. `onFinish` just uses `result.capturedChoiceSpec` directly (which is either model-emitted or orchestrator-injected fallback).
3. **Fixed `uiMessageId: undefined`** → now uses `result.messageId` from the orchestrator. This makes live-to-persisted reconciliation robust for search responses.

### Part 3: Belt-and-suspenders incremental rehydration (ChatWindow.tsx)

**File changed:** `src/components/chat/ChatWindow.tsx`

Added a secondary `useEffect` (labeled "3b. Incremental choice-spec rehydration") that watches `historyMessages` for the SAME already-synced conversation. When:
- A persisted assistant message has `jsonRendererChoice`
- The corresponding live `useChat` message (matched by `_id` or `uiMessageId`) lacks `SPEC_DATA_PART_TYPE` in its parts

...it merges the spec into the existing `useChat` state via `setMessages`. Pattern follows the existing reasoning-duration rehydration at lines 1605-1656.

**Why this is needed alongside Part 1:** Part 1 is the primary fix. Part 3 handles edge cases: network hiccup drops the stream chunk, or the DB persist completes but stream chunk was missed. Either channel alone is sufficient; both together provide durability.

---

## What Was NOT Changed

- Starter prompt flow — untouched.
- Optimistic rendering — untouched.
- Existing reasoning rehydration — untouched.
- Guaranteed fallback behavior — strengthened, not removed.
- Tools path choice card flow — untouched (already worked correctly via `build-step-stream.ts` → `pipeYamlRender` → `SPEC_DATA_PART_TYPE`).

---

## Verification Results

### Tests (all pass)
```
Choice-card tests:     45/45 passed (5 files)
Search orchestrator:    9/9 passed (2 files)
ChatWindow reasoning:   4/4 passed
Broader chat tests:   127/127 passed (12 files)
```

### Build
```
npm run build — clean, zero errors
```

### Pre-existing failures (not caused by this fix)
10 test files with 21 pre-existing failures (billing-bpp, chat-input-desktop, attachment, reference-presentation tests). All unrelated to choice card or search path.

---

## Observability Map Update Needed

The new log tag `[CHOICE-CARD][guaranteed][stream]` should be added to `OBSERVABILITY-MAP.md` under the orchestrator section. I will defer this to after your audit confirmation.

---

## Questions for Codex

1. Do you want me to add a dedicated regression test for the stream-side fallback emission? The existing `MessageBubble.choicespec-streaming.test.tsx` validates spec parsing but doesn't test the orchestrator's fallback injection path specifically.

2. The incremental rehydration `useEffect` in ChatWindow matches messages by both `_id` and `uiMessageId`. Should we add a guard to prevent double-injection if both keys match the same message?

---

## Files Changed Summary

| File | Change |
|---|---|
| `src/lib/ai/web-search/types.ts` | +`compileGuaranteedChoiceSpec` config, +`messageId` result field |
| `src/lib/ai/web-search/orchestrator.ts` | Emit fallback `SPEC_DATA_PART_TYPE` to stream, pass `messageId` |
| `src/lib/chat-harness/context/execute-web-search-path.ts` | Provide callback, simplify onFinish, use `result.messageId` |
| `src/components/chat/ChatWindow.tsx` | Add incremental choice-spec rehydration useEffect |
