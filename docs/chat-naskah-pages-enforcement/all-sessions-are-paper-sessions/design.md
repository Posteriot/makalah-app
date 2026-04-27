# All Sessions Are Paper Sessions (v3 — post-Codex audit)

**Date:** 2026-04-14
**Branch:** `chat-naskah-pages-enforcement`
**Approach:** Surgical Removal (modify in place)
**Audit status:** Codex reviewed twice. All critical issues resolved in v3.

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
| Session creation | Auto-create via `ctx.db.insert` in same transaction as conversation creation | Atomic, no race condition. Eliminates intent detection and workflow reminder entirely. |
| Completed state | Navigable stage (no short-circuit) | Model fully active, rewind available, no dead-end |
| Rewind mechanism | UI timeline (deterministic) + model awareness (suggests, doesn't trigger) | Deterministic = zero risk wrong stage. Model guides, UI executes. |
| Rewind limit | No limit — all validated stages clickable in ALL 3 progress components | Confirmation dialog is sufficient guard. Warning includes stage count for large rewinds. |
| Dead code | Full removal | Intent detector, workflow reminder, completed classifier — all exist only because of dual-mode |
| Migration | Lazy — `ensurePaperSessionExists` mutation called inside `getPaperModeSystemPrompt` | Must happen before prompt is built (not after). Auth-guarded. OCC-safe single-transaction read+insert. |
| updateStageData in completed | Keep throwing (preserve caller contract), improve error message | Callers (paper-tools.ts, route.ts auto-link) don't read return values — changing to return {success: false} would cause silent failure. |
| isPaperMode removal | Replace `!!session` with `sessionState: "loading" | "ready"` in usePaperSession hook | Hardcoding `true` lies to runtime when query is loading. Proper state machine is safer. |
| completedAt clearing | Use Convex `ctx.db.patch` with `completedAt: undefined` — verified to remove field | AI ops queries filter `completedAt === undefined` for active sessions; clearing correctly marks session as active again. |
| Completed UX | Unified: model directs user to progress timeline for rewind (not sidebar) | Replace stale fallback at `paper-stages/index.ts:75` that references sidebar artifact history. |
| Duplicate row remediation | `ensurePaperSessionExists` uses `.unique()` query — if it throws due to pre-existing duplicates, the error surfaces immediately rather than silently corrupting state | Follow-up: add one-time migration script to deduplicate any existing rows. |

## Architecture Changes

### Section 1: Auto-Create Paper Session on Conversation Creation

**File:** `convex/conversations.ts` — `createConversation` mutation

After inserting conversation doc, create paper session in same transaction via `ctx.db.insert("paperSessions", {...})`:
- `currentStage: "gagasan"`
- `stageStatus: "drafting"`
- `stageData: {}` — verified valid against schema: `v.object({...})` with all stage fields `v.optional()`, so empty object passes validation.

Delete `startPaperSession` tool from `paper-tools.ts` and its reference in `chat-config.ts`.

### Section 2: Remove Dual-Mode Detection & Routing

**Delete files (5):**
- `src/lib/ai/paper-intent-detector.ts`
- `src/lib/ai/paper-workflow-reminder.ts`
- `src/lib/ai/completed-session.ts`
- `src/lib/ai/classifiers/completed-session-classifier.ts`
- `src/lib/ai/classifiers/completed-session-classifier.test.ts`

**Fix all runtime references before deletion:**
- `src/components/chat/ChatWindow.tsx:48,166` — remove `hasPaperWritingIntent` import and usage
- `src/lib/ai/classifiers/schemas.ts:3,10,57,159-161` — remove `CompletedSessionHandling` type import and schema

**Changes in `route.ts`:**
- Remove imports (lines 20-22)
- Remove intent detection block (lines 518-521)
- Remove workflow reminder from system messages (lines 862-864)
- Remove `forcePaperToolsMode` and its branch (lines 2431, 2458-2465)
- Remove `first_message_chat_mode` fast path (lines 2466-2470)
- Remove completed-prestream block (lines 2563-2805, ~240 lines)
- Remove `paperWorkflowReminder` from orchestrator params (line 3037)

**Update telemetry UI (non-breaking but stale after change):**
- `src/components/ai-ops/panels/RecentFailuresPanel.tsx:34` — remove `startPaperSession` label
- `src/components/ai-ops/panels/ToolHealthPanel.tsx:40,44` — remove `(chat biasa)` and `startPaperSession` labels
- `src/components/chat/ToolStateIndicator.tsx:26` — remove `startPaperSession` label

**Net effect:** ~250 lines of branching logic removed from route.ts.

### Section 3: Completed State — From Dead-End to Navigable

**File:** `convex/paperSessions.ts`

1. **`updateStageData`** (line 655) — add explicit completed guard before existing `STAGE_ORDER.includes` check. Throws with descriptive message: `"Cannot update stage data in completed state — rewind to a specific stage first"`. Preserves caller contract (all callers expect throw for invalid state).

2. **`isValidRewindTarget`** (line 1542) — handle "completed" as virtual index `STAGE_ORDER.length`:
   ```
   currentIndex = currentStage === "completed" ? STAGE_ORDER.length : STAGE_ORDER.indexOf(currentStage)
   ```

3. **`getStagesToInvalidate`** (line 1583) — same fix.

4. **`rewindToStage`** (line 1757) — clear `completedAt` via `ctx.db.patch({completedAt: undefined})`. This removes the field, making `aiOps.ts:57` filter `q.eq(q.field("completedAt"), undefined)` correctly count the session as active again. Log large rewinds (>5 stages) for observability.

### Section 4: UI — Unlock Full Stage Navigation

**ALL 3 progress components** (not just PaperStageProgress):
- `src/components/paper/PaperStageProgress.tsx:34`
- `src/components/chat/sidebar/SidebarProgress.tsx:31`
- `src/components/chat/sidebar/SidebarQueueProgress.tsx:41`

In each: delete `MAX_REWIND_STAGES` constant, simplify `isValidRewindTarget` to only check `stageIndex < currentIndex` AND `validatedAt` exists.

**RewindConfirmationDialog:** No guard needed for completed label — `getStageLabel("completed")` already returns `"Selesai"` (verified at `constants.ts:42-43`). Add invalidated stage count to warning text; explicit warning for full-paper invalidation (14 stages).

### Section 5: Paper Mode Prompt — Unified Completed State

**File:** `src/lib/ai/paper-mode-prompt.ts`

When `currentStage === "completed"`, inject completed-state prompt instead of stage skill. Model directs user to progress timeline for rewind (not sidebar).

**File:** `src/lib/ai/paper-stages/index.ts:75`

Replace stale completed fallback (references sidebar artifact history) with timeline-consistent instructions.

Remove or simplify existing completed overrides at `paper-mode-prompt.ts:929-944` if redundant.

### Section 6: Lazy Migration

**File:** `src/lib/ai/paper-mode-prompt.ts` — inside `getPaperModeSystemPrompt`

When session query returns null, call `ensurePaperSessionExists` mutation before building prompt. This requires adding `userId` parameter to `getPaperModeSystemPrompt` signature and updating the call site at `route.ts:359-363`.

**File:** `convex/paperSessions.ts` — new `ensurePaperSessionExists` internal mutation

Auth-guarded (calls `requireAuthUserId` + `requireConversationOwner`, same guards as existing `create` mutation). Read + insert in single Convex transaction (OCC-safe). Not a public tool-facing mutation — internal migration helper only.

### Section 7: Remove Dead isPaperMode Branches

**File:** `src/lib/hooks/usePaperSession.ts:111`

Replace `isPaperMode = !!session` with proper loading state:
```typescript
const sessionState: "loading" | "ready" = session === undefined ? "loading" : "ready"
```

Consumer sites that use `isPaperMode` for gating should check `sessionState === "ready"` instead. Empty-state UI in `SidebarProgress.tsx:346` and `SidebarQueueProgress.tsx:507` replaced with loading state.

## Bug Fixes Included

| Bug | Resolution |
|-----|-----------|
| `updateStageData` crashes on `completed` | Section 3: explicit throw with descriptive message (preserves caller contract) |
| `completed-prestream` too aggressive | Section 2: entire block deleted |

## Bug Fixes NOT Included (Separate Issues)

| Bug | Reason |
|-----|--------|
| Artifact relevance validation (wrong content in wrong stage) | Orthogonal — artifact content validation, not session mode |
| `emitChoiceCard` pseudo-tool (commit b1917560) | Already fixed, needs re-test only |
| Enforcer infinite loop (commit 4d17d05f) | Already fixed, needs re-test only |
| Duplicate paperSession rows (if any pre-existing) | Follow-up migration script, not blocking |

## Re-Test Items After Implementation

- Stages 13-14: verify YAML choice cards render correctly (post emitChoiceCard removal)
- Enforcer: verify no infinite loops on any stage
- Rewind from completed: verify all 14 stages clickable and rewind works (all 3 components)
- Rewind from completed to gagasan: dialog warns "14 tahap akan di-invalidate"
- Lazy migration: verify existing conversations get paper session on first message
- New conversation: verify paper session auto-created, gagasan stage active immediately
- AI ops dashboard: verify active/completed session counts still accurate after completedAt clearing
- Sidebar progress: no "bukan sesi paper" empty state (replaced with loading)
