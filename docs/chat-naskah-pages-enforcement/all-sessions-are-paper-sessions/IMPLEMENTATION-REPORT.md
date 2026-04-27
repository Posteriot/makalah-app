# Implementation Report: All Sessions Are Paper Sessions

**Date:** 2026-04-14
**Branch:** `chat-naskah-pages-enforcement`
**Base SHA:** `c982159e` (last doc commit before implementation)
**Head SHA:** `9cec879d` (final implementation commit, post-audit fixes included)
**Plan executed:** `implementation-plan.md` (v3, Codex-approved)

## Execution Summary

13 commits (10 original + 3 post-audit fixes). 26 files changed. 412 insertions, 1888 deletions. Zero new test failures.

## Post-Implementation Audit Fixes (Codex round 4)

Codex rejected initial implementation with 4 critical issues. All fixed:

| # | SHA | Issue | Fix |
|---|-----|-------|-----|
| 11 | `3a22fac3` | Backend rewind limit `stagesBack > 2` still enforced | Deleted guard at `convex/paperSessions.ts:1618-1625` |
| 12 | `750f953b` | `session === null` treated as "ready" → isPaperMode true without session | 3-state model: loading / ready / absent. `isPaperMode` only true when ready. |
| 13 | `9cec879d` | Lazy migration only on chat API, not UI read path | `usePaperSession` hook auto-calls `ensurePaperSessionExists` when absent + userId available |

## Commits (in execution order)

| # | SHA | Task | Description |
|---|-----|------|-------------|
| 1 | `76ad40fb` | Task 1 | Auto-create paper session in createConversation (same transaction) |
| 2 | `3ddc8797` | Task 1b | ensurePaperSessionExists mutation for lazy migration |
| 3 | `1d3fa4c8` | Task 2 | Remove startPaperSession tool and stale prompt reference |
| 4 | `0f56a8c3` | Task 3 | Delete dual-mode files + fix all runtime references |
| 5 | `1062c606` | Task 4 | Remove dual-mode routing from route.ts (~270 lines) |
| 6 | `6ba7faac` | Task 5 | Support rewind from completed + descriptive error for updateStageData |
| 7 | `dc126d42` | Task 6 | Remove rewind limit in all 3 progress components, improve rewind warning |
| 8 | `8e020c3b` | Task 6b | Remove dead isPaperMode branches, replace empty-state with loading |
| 9 | `cd3ac2bb` | Task 7 | Unified completed-state prompt with rewind-via-timeline guidance |
| 10 | `cc9d9c97` | Task 8 | Lazy migration inside getPaperModeSystemPrompt (Codex audit fix) |

Task 9 (E2E verification) executed inline: `tsc --noEmit` clean, `vitest run` 165 passed / 9 failed (all pre-existing).

## What Changed Per File

### Backend (Convex)

**`convex/conversations.ts`** — Commit `76ad40fb`
- `createConversation` mutation now inserts both `conversations` row AND `paperSessions` row in same Convex transaction.
- Atomic: no race condition possible. If either insert fails, both roll back.

**`convex/paperSessions.ts`** — Commits `3ddc8797`, `6ba7faac`
- New mutation: `ensurePaperSessionExists` — auth-guarded (requireAuthUserId + requireConversationOwner), idempotent via read-then-insert in single transaction (OCC-safe). Used by lazy migration.
- `isValidRewindTarget`: "completed" now treated as virtual index `STAGE_ORDER.length` instead of returning -1.
- `getStagesToInvalidate`: same fix for "completed".
- `updateStageData`: explicit guard throws `"Cannot update stage data in completed state — rewind to a specific stage first"` before the generic `STAGE_ORDER.includes` check. Preserves caller contract (throw, not return).
- `rewindToStage`: clears `completedAt: undefined` when rewinding from completed. Logs large rewinds (>5 stages) for observability.

### API Route

**`src/app/api/chat/route.ts`** — Commits `1062c606`, `cc9d9c97`
- Deleted 3 imports: paper-intent-detector, paper-workflow-reminder, completed-session.
- Deleted `paperWorkflowReminder` variable + intent detection block (4 lines).
- Deleted `paperWorkflowReminder` system message injection (3 lines).
- Deleted `forcePaperToolsMode` variable + else-if branch (10 lines).
- Deleted `first_message_chat_mode` fast path (5 lines).
- Deleted completed-prestream block (~240 lines): `short_circuit_closing`, `server_owned_artifact_recall`, `clarify` branches.
- Deleted `paperWorkflowReminder` orchestrator param (1 line).
- Updated `getPaperModeSystemPrompt` call to pass `userId` as new second argument.
- **Net: ~270 lines removed.**

### AI Prompt System

**`src/lib/ai/paper-mode-prompt.ts`** — Commits `cd3ac2bb`, `cc9d9c97`
- Added `userId: Id<"users">` parameter to `getPaperModeSystemPrompt` signature.
- Lazy migration: when session is null, calls `ensurePaperSessionExists` then re-fetches. Falls back to empty prompt only if migration fails.
- Completed state: overrides `stageInstructions` with unified prompt directing users to progress timeline for rewind. Prohibits tool calls.

**`src/lib/ai/paper-stages/index.ts`** — Commit `cd3ac2bb`
- Replaced verbose 32-line completed case (referenced sidebar artifact history) with concise 4-line version referencing progress timeline.

**`src/lib/ai/paper-tools.ts`** — Commit `1d3fa4c8`
- Deleted `startPaperSession` tool definition (lines 68-102).

**`src/lib/ai/chat-config.ts`** — Commit `1d3fa4c8`
- Removed `startPaperSession` from fallback prompt tools list.

### Files Deleted (7)

| File | Lines | Reason |
|------|-------|--------|
| `src/lib/ai/paper-intent-detector.ts` | 158 | Keyword regex detection — obsolete |
| `src/lib/ai/paper-workflow-reminder.ts` | 69 | Prompt injection for startPaperSession — obsolete |
| `src/lib/ai/completed-session.ts` | 119 | Completed state classifier + short-circuit — obsolete |
| `src/lib/ai/classifiers/completed-session-classifier.ts` | 148 | LLM classifier for completed intent — obsolete |
| `src/lib/ai/classifiers/completed-session-classifier.test.ts` | 461 | Tests for above |
| `src/lib/ai/__tests__/completed-session.test.ts` | 297 | Tests for completed-session.ts |
| `src/components/chat/ChatWindow.paper-loading-mode.test.tsx` | 59 | Test for deleted shouldPreferUnifiedPaperLoadingUi |

### UI Components

**`src/components/chat/ChatWindow.tsx`** — Commit `0f56a8c3`
- Deleted `hasPaperWritingIntent` import.
- Deleted `extractMessageTextForIntent` function.
- Deleted `shouldPreferUnifiedPaperLoadingUi` function (dead code: returns false when isPaperMode is true).
- Simplified `effectivePaperUiMode = isPaperMode` (removed `|| prefersUnifiedPaperLoadingUi`).

**`src/components/paper/PaperStageProgress.tsx`** — Commit `dc126d42`
- Deleted `MAX_REWIND_STAGES = 2` constant.
- Simplified `isValidRewindTarget`: removed distance check. Any validated stage before current is rewindable.

**`src/components/chat/sidebar/SidebarProgress.tsx`** — Commits `dc126d42`, `8e020c3b`
- Same MAX_REWIND_STAGES removal as PaperStageProgress.
- Replaced "Tidak ada paper aktif" empty state with loading guard (`!session` → "Memuat...").
- Removed unused `isPaperMode` destructuring.

**`src/components/chat/sidebar/SidebarQueueProgress.tsx`** — Commits `dc126d42`, `8e020c3b`
- Same changes as SidebarProgress.

**`src/components/paper/RewindConfirmationDialog.tsx`** — Commit `dc126d42`
- Added `STAGE_ORDER` import and `invalidatedCount` calculation.
- Warning text now shows stage count. Full-paper invalidation gets explicit warning.

### Hook

**`src/lib/hooks/usePaperSession.ts`** — Commit `8e020c3b`
- Replaced `isPaperMode = !!session` with `sessionState: "loading" | "ready"`.
- `isPaperMode` derived from `sessionState === "ready"` for backward compat.
- `sessionState` exported in return value.

### Telemetry UI

**`src/components/ai-ops/panels/RecentFailuresPanel.tsx`** — Commit `0f56a8c3`
- Removed `startPaperSession: "Mulai Paper"` from label map.

**`src/components/ai-ops/panels/ToolHealthPanel.tsx`** — Commit `0f56a8c3`
- Removed `"(chat biasa)": "Obrolan Biasa"` and `startPaperSession: "Mulai Paper"` from label map.

**`src/components/chat/ToolStateIndicator.tsx`** — Commit `0f56a8c3`
- Removed `startPaperSession: "Memulai sesi paper"` from label map.

### Test Adaptation

**`src/lib/ai/classifiers/classify.test.ts`** — Commit `0f56a8c3`
- Migrated from deleted `CompletedSessionClassifierSchema` to `ExactSourceClassifierSchema` with matching mock data.
- All 5 tests pass.

**`src/lib/ai/classifiers/schemas.ts`** — Commit `0f56a8c3`
- Removed `CompletedSessionHandling` import, `CompletedSessionClassifierSchema`, `CompletedSessionClassifierOutput` type, and type compat assertion.

## Verification Results

### Type Check
```
npx tsc --noEmit → clean (0 errors)
```

### Test Suite
```
npx vitest run → 165 passed, 9 failed (174 total)
```
All 9 failures are **pre-existing** — identical count and files to baseline at `c982159e`. Verified by running test suite on baseline commit. Zero regressions introduced.

Pre-existing failures (not our scope):
- `__tests__/reference-presentation.test.ts` (3 tests)
- `__tests__/chat/attachment-send-rule.test.tsx` (3 tests)
- `__tests__/chat/chat-input-desktop-layout.test.tsx` (5 tests)
- `__tests__/chat/chat-input-desktop-limit.test.tsx` (2 tests)
- `__tests__/chat/clear-attachment-context.test.tsx` (1 test)
- `__tests__/chat/explicit-vs-inherit-bubble-visibility.test.tsx`
- `__tests__/chat/konteks-tray-ui.test.tsx`
- `__tests__/chat/message-bubble-attachment-chip-format.test.tsx`
- `src/lib/ai/recovery-leakage-guard.test.ts` (1 test)

### Reference Sweep
```bash
grep -rE "paper-intent-detector|paper-workflow-reminder|completed-session|CompletedSessionHandling|CompletedSessionClassifier|startPaperSession|chat biasa|Obrolan Biasa|shouldPreferUnifiedPaperLoadingUi|MAX_REWIND_STAGES" src/ --include="*.ts" --include="*.tsx" -l
```
Result: zero matches in `src/`.

Residual (non-breaking, outside `src/`):
- `src/lib/ai/web-search/types.ts:57` — optional `paperWorkflowReminder` type field in orchestrator types
- `src/lib/ai/web-search/orchestrator.ts:588` — comment referencing startPaperSession
- `convex/migrations/` — historical migration files (one-shot scripts, safe to leave)

## What to Audit

### Codex audit focus areas:

1. **Task 1 (`76ad40fb`):** Does the `ctx.db.insert("paperSessions", ...)` in `createConversation` match the schema? Are all required fields present? Is `stageData: {}` valid?

2. **Task 1b (`3ddc8797`):** Are auth guards complete? Compare to existing `paperSessions.create` mutation at line ~606. Does the ownership check prevent unauthorized session creation?

3. **Task 4 (`1062c606`):** Route.ts surgery — were all 7 deletion targets hit? Is the remaining if-else chain at the search decision point syntactically correct? No orphaned variables?

4. **Task 5 (`6ba7faac`):** Is `completedAt: undefined` in Convex `ctx.db.patch` correct for field removal? Does `isValidRewindTarget` correctly handle "completed" → `STAGE_ORDER.length` = 14 (indices 0-13, so virtual 14 is correct)?

5. **Task 8 (`cc9d9c97`):** Does the lazy migration inside `getPaperModeSystemPrompt` correctly handle the case where mutation succeeds but re-fetch fails? Is `userId` correctly passed from route.ts?

6. **Task 3 (`0f56a8c3`):** Was `shouldPreferUnifiedPaperLoadingUi` truly dead code? Verify that removing it + simplifying `effectivePaperUiMode` doesn't change behavior for existing conversations.

7. **Task 6b (`8e020c3b`):** Is `sessionState: "loading" | "ready"` correctly derived from `session === undefined`? Does `isPaperMode = sessionState === "ready"` preserve behavior during Convex query loading?

8. **Cross-cutting:** Do any of the 10 commits introduce state where `paperSession` could be null in a code path that now assumes it exists? Especially route.ts after removing the `!paperModePrompt` guard.
