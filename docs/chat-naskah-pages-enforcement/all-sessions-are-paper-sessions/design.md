# All Sessions Are Paper Sessions

**Date:** 2026-04-14
**Branch:** `chat-naskah-pages-enforcement`
**Approach:** Surgical Removal (modify in place)

## Problem

Makalah AI maintains two conversation modes — free chat and paper session. This dual-mode architecture creates:

1. **Session state confusion after `completed`**: User stuck in dead-end state. `completed-prestream` short-circuits responses. `updateStageData` crashes with `Unknown stage: completed`.
2. **Model escapes paper session context**: Context pollution across stages causes wrong artifacts, premature completion.
3. **Dual-mode complexity**: Every guard, enforcer, and validator handles both paths. Edge cases at mode boundaries.
4. **User expectation mismatch**: Paper session gets stuck or completes prematurely, user locked out.

## Decision

**Every conversation is a paper session. There is no "chat biasa" mode.**

All discussion — academic dialog, brainstorming, concept questions, draft review — happens within the 14-stage paper workflow. The product is exclusively for writing papers.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Session creation | Auto-create when conversation created | Eliminates intent detection and workflow reminder entirely |
| Completed state | Navigable stage (no short-circuit) | Model fully active, rewind available, no dead-end |
| Rewind mechanism | UI timeline (deterministic) + model awareness (suggests, doesn't trigger) | Deterministic = zero risk wrong stage. Model guides, UI executes. |
| Rewind limit | No limit — all validated stages clickable | Confirmation dialog is sufficient guard |
| Dead code | Full removal | Intent detector, workflow reminder, completed classifier — all exist only because of dual-mode |
| Migration | Lazy — create paper session on first API interaction for existing conversations | Zero downtime, idempotent, no batch risk |

## Architecture Changes

### Section 1: Auto-Create Paper Session on Conversation Creation

**File:** `convex/conversations.ts` — `createConversation` mutation

After inserting conversation doc, also create paper session:
- `currentStage: "gagasan"`
- `stageStatus: "drafting"`
- `stageData: {}` (empty — first user message becomes gagasan input)

Delete `startPaperSession` tool from `paper-tools.ts`.

**Lazy migration** in `route.ts`: if `getByConversation` returns null, auto-create paper session before proceeding. Idempotent — `paperSessions.create` already checks for existing session.

### Section 2: Remove Dual-Mode Detection & Routing

**Delete files:**
- `src/lib/ai/paper-intent-detector.ts` — keyword regex detection
- `src/lib/ai/paper-workflow-reminder.ts` — prompt injection for startPaperSession
- `src/lib/ai/completed-session.ts` — completed state classifier + short-circuit
- `src/lib/ai/classifiers/completed-session-classifier.ts` — LLM classifier
- `src/lib/ai/classifiers/completed-session-classifier.test.ts` — tests

**Changes in `route.ts`:**
- Remove intent detection path (~line 358-366 area) — `hasPaperWritingIntent()` check and `PAPER_WORKFLOW_REMINDER` injection
- Remove completed-prestream block (~lines 2570-2804) — entire `if (currentStage === "completed")` block (~230 lines)
- Remove related imports

**Net effect:** ~250 lines of branching logic removed from route.ts. System prompt assembly becomes linear.

### Section 3: Completed State — From Dead-End to Navigable

**File:** `convex/paperSessions.ts`

1. **`updateStageData`** — graceful no-op for completed stage:
   ```
   if (currentStage === "completed") return { success: false, reason: "session_completed_rewind_required" }
   ```

2. **`isValidRewindTarget`** (line 1542) — fix completed handling:
   ```
   currentIndex = currentStage === "completed" ? STAGE_ORDER.length : STAGE_ORDER.indexOf(currentStage)
   ```
   Currently returns -1 for "completed" → breaks rewind from completed state.

3. **`getStagesToInvalidate`** (line 1583) — same fix for completed as virtual index.

4. **`rewindToStage`** — clear `completedAt` when rewinding from completed state.

### Section 4: UI — Unlock Full Stage Navigation

**File:** `src/components/paper/PaperStageProgress.tsx`

1. Delete `MAX_REWIND_STAGES = 2` constant
2. Simplify `isValidRewindTarget` — only check: `stageIndex < currentIndex` AND `validatedAt` exists
3. Completed state: all 14 badges clickable (currentIndex = STAGE_ORDER.length, already handled)
4. Tooltip on rewindable stages: "Klik untuk revisi tahap ini"

**File:** `src/components/paper/RewindConfirmationDialog.tsx`

Guard for completed label:
```typescript
const currentLabel = currentStage === "completed" ? "Selesai" : getStageLabel(currentStage)
```

### Section 5: Paper Mode Prompt — Completed State Awareness

**File:** `src/lib/ai/paper-mode-prompt.ts`

When `currentStage === "completed"`, inject completed-state prompt instead of stage skill:
- Model can answer questions about any part of the paper
- Model suggests specific stages to rewind to via UI timeline
- Model CANNOT call updateStageData, createArtifact, or submitStageForValidation
- No choice card in completed state (existing exception preserved)
- Memory digest and stage data summaries still injected as context

### Section 6: Lazy Migration

**File:** `src/app/api/chat/route.ts`

After fetching paper session, if null:
```typescript
if (!paperSession) {
    await fetchMutation(api.paperSessions.create, { userId, conversationId });
    paperSession = await fetchQuery(api.paperSessions.getByConversation, { conversationId });
}
```

Uses `ensurePaperSessionExists` mutation (read-then-insert in same Convex transaction, OCC-safe). Remove after ~30 days when all active conversations migrated.

> **Codex audit fix:** Lazy migration must happen INSIDE `getPaperModeSystemPrompt`, not after it returns. The function returns empty prompt when session is null, and route.ts skips paper session fetch when prompt is empty — migration after the function is too late.

> **Codex audit fix:** `paperSessions.create` is NOT idempotent — `by_conversation` is a Convex index, not a unique constraint. Concurrent requests can insert duplicates. Fix: `ensurePaperSessionExists` mutation with read+insert in single transaction (Convex OCC handles retry).

## Bug Fixes Included

| Bug | Resolution |
|-----|-----------|
| `updateStageData` crashes on `completed` | Section 3: keep throwing (preserve caller contract), improve error message |
| `completed-prestream` too aggressive | Section 2: entire block deleted |

> **Codex audit fix:** Original design proposed `return {success: false}` for completed state. This is wrong — callers (paper-tools.ts, route.ts auto-link) don't read return values and would silently fail. Fix: keep throwing with descriptive error message.

## Bug Fixes NOT Included (Separate Issues)

| Bug | Reason |
|-----|--------|
| Artifact relevance validation (wrong content in wrong stage) | Orthogonal — artifact content validation, not session mode |
| `emitChoiceCard` pseudo-tool (commit b1917560) | Already fixed, needs re-test only |
| Enforcer infinite loop (commit 4d17d05f) | Already fixed, needs re-test only |

## Re-Test Items After Implementation

- Stages 13-14: verify YAML choice cards render correctly (post emitChoiceCard removal)
- Enforcer: verify no infinite loops on any stage
- Rewind from completed: verify all 14 stages clickable and rewind works
- Lazy migration: verify existing conversations get paper session on first interaction
- New conversation: verify paper session auto-created, gagasan stage active immediately
