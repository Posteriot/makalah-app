# Context: Model Compliance — Save After Search

> Handoff document for a separate branch. Factual conditions and observed problems only.
> No solutions proposed.

---

## Background

Branch `feature/plan-task-queue-components` added frontend UI components (Plan card,
Chain of Thought, sidebar Queue) that visualize task progress within each paper writing
stage. These components derive task completion status from `stageData` fields in Convex.

During testing, a visibility gap was exposed: **Plan card frequently shows 0/N tasks
complete for extended periods** because the model does not call `updateStageData` to
save progress incrementally. The UI is working correctly — it honestly reflects that
the database is empty.

---

## Observed Problem

### Behavior pattern (reproduced consistently with Gemini 2.5 Flash)

1. **Turn 1 (search turn):** User provides topic. Search orchestrator runs (two-pass:
   Phase 1 retrieval → Phase 1.5 content fetch → Phase 2 compose). Model generates
   response with citations. `referensiAwal` auto-persisted by `appendSearchReferences`.
   **No other stageData fields saved** — model cannot call tools in compose phase.

2. **Turn 2 (tools-available turn):** User responds (e.g., selects choice card option).
   Model has search results in conversation context. Tools are available. Model discusses
   and presents a choice card. **Does not call `updateStageData`** despite having data
   to save (ideKasar, analisis, angle).

3. **Turn 3 (tools-available turn):** User confirms. Model finally calls `updateStageData`
   with ALL fields at once (bulk save) + `createArtifact` + `submitStageForValidation`.
   Tasks jump from 1/4 → 4/4 in one step.

### Terminal log evidence

```
Turn 1: [PlanContext] stage=gagasan tasks=0/4 (all pending)
         → search runs → appendSearchReferences → referensiAwal auto-saved
         → compose output: 692 chars (short)

Turn 2: [PlanContext] stage=gagasan tasks=1/4 (referensiAwal: complete, rest: pending)
         → tools available → model discusses, shows choice card
         → NO updateStageData call

Turn 3: [PlanContext] stage=gagasan tasks=1/4 (unchanged)
         → tools available → model calls updateStageData (ALL fields)
         → immediately calls createArtifact + submitStageForValidation
         → tasks jump to 4/4
```

### Compose phase "promise" problem

In the search turn (Turn 1), the model sometimes outputs text like:
- "Saya akan mencari referensi tentang..."
- "Beri saya waktu sebentar untuk mencari referensi yang relevan ya!"

This occurs despite COMPOSE_PHASE_DIRECTIVE explicitly stating:
- "DO NOT: Promise to search"
- "DO NOT: Announce that you will perform a search"

The search has ALREADY been completed by the orchestrator before the model sees the
results. The model is narrating an action that already happened.

---

## Architectural Context

### Two-pass search orchestrator (orchestrator.ts)

Search is NOT a tool call. It runs server-side before `streamText`:

```
Phase 1:   Retriever chain (Google Grounding / Perplexity) → sources
Phase 1.5: FetchWeb → page content for top 7 URLs
Phase 2:   Compose → streamText WITHOUT tools (compose-only model call)
```

Key constraint: **compose phase has NO tools**. `streamText()` is called WITHOUT
`tools` parameter at orchestrator.ts line 601. COMPOSE_PHASE_DIRECTIVE explicitly
tells the model "You have NO access to tools in this phase."

### Tools-only turn (route.ts)

When `enableWebSearch = false` and `searchAlreadyDone = true`:
- `getFunctionToolsModeNote("Search completed")` injected as system message
- All paper tools available: updateStageData, createArtifact, submitStageForValidation
- `maxToolSteps = 5` (model can make up to 5 tool calls)
- `toolChoice = "auto"` (model decides whether to call tools)

### paperModePrompt exclusion from compose

`paperModePrompt` is **excluded from compose phase** (orchestrator.ts line 539):
```
// EXCLUDED from compose phase:
// - paperModePrompt: Contains workflow and tool-usage instructions that conflict
//   with compose behavior.
```

Only `config.systemPrompt` (primary system prompt from DB) enters compose phase.

### appendSearchReferences (proven auto-save pattern)

`appendSearchReferences` in `convex/paperSessions.ts` auto-persists search references
to stageData after search completes. This is code-level enforcement — no model
cooperation needed. It's why `referensiAwal` is always complete after search.

---

## What Was Attempted and Reverted

The following approaches were tried in `feature/plan-task-queue-components` and
subsequently reverted because they either didn't work or risked disrupting the
existing search orchestrator architecture:

### 1. Prompt instruction changes (reverted)

- Added "SAVE PROGRESS INCREMENTALLY" to GENERAL RULES in paper-mode-prompt.ts
- Added "MANDATORY — SAVE PROGRESS NOW" to getFunctionToolsModeNote
- Added "A response under 500 characters means you are NOT doing your job" to
  COMPOSE_PHASE_DIRECTIVE
- **Result:** Model ignored all instructions ~50% of the time

### 2. Plan context injection into system prompt (reverted)

- Injected `CURRENT PLAN CONTEXT` with task list into paper-mode-prompt.ts
- Showed model "Tasks: 0/4 complete" with field status
- **Result:** Model verbalized the plan context to user ("Saya akan mengeksplorasi
  ide ini...") instead of just doing it. Added "DO NOT reference" guard — model
  still ignored.
- **Risk discovered:** Although paperModePrompt is excluded from compose phase,
  the additional prompt tokens increased total context, and the plan context
  semantically conflicted with compose phase behavior.

### 3. prepareStep force updateStageData (reverted)

- Used `prepareStep` to force `toolChoice: { type: "tool", toolName: "updateStageData" }`
  at step 0 in tools-available turns after search
- Pattern based on existing `deterministicSyncPrepareStep` (proven for getCurrentPaperState)
- Guard: `searchAlreadyDone && !stageAlreadySaved && stageStatus === "drafting"`
- **Result:** Not tested thoroughly before revert. Concern: `searchAlreadyDone`
  stays true permanently (via stageData evidence path), requiring additional
  `stageAlreadySaved` guard to prevent repeat forcing.

---

## Existing Codebase Patterns Relevant to This Problem

### deterministicSyncPrepareStep (route.ts ~line 2147)

Forces `getCurrentPaperState` tool call at step 0 for sync requests. Proven pattern.
Uses `prepareStep` with `toolChoice: { type: "tool" }` and `activeTools` restriction.

### buildDeterministicExactSourcePrepareStep (exact-source-guardrails.ts ~line 179)

Forces `inspectSourceDocument` at step 0 for exact source follow-ups. Another proven
`prepareStep` pattern.

### appendSearchReferences (convex/paperSessions.ts)

Auto-persists search references to stageData without model cooperation. Code-level
enforcement. Always works.

### getMessageStage (lib/utils/paperPermissions.ts ~line 85)

Determines which stage a message belongs to based on `validatedAt` timestamps.
Used by Plan card UI to show correct stage per message.

---

## Files Involved

| File | Role | Current state |
|------|------|---------------|
| `src/app/api/chat/route.ts` | Main chat route, streamText, tool routing | **Unchanged from main** |
| `src/lib/ai/paper-mode-prompt.ts` | Paper mode system prompt builder | **Unchanged from main** |
| `src/lib/ai/paper-search-helpers.ts` | Search helper notes (function tools mode) | **Unchanged from main** |
| `src/lib/ai/web-search/orchestrator.ts` | Two-pass search orchestrator | **Unchanged from main** |
| `src/lib/ai/paper-tools.ts` | Tool definitions (updateStageData, etc.) | **Unchanged from main** |
| `convex/paperSessions.ts` | Convex mutations (appendSearchReferences, updateStageData) | **Unchanged from main** |

---

## Key Constraints

1. **Compose phase cannot have tools** — orchestrator architecture design decision.
   Search results are presented as informational content, tools are for transactional
   saves. These are deliberately separated into different turns.

2. **`toolChoice: "auto"` means model decides** — in tools-available turns, the model
   can generate text without calling any tool. Nothing in the current architecture
   forces tool calls (except deterministicSyncPrepareStep and exact source patterns).

3. **`searchAlreadyDone` is permanent** — once search results exist in stageData
   (via `hasPreviousSearchResults`), this flag stays true for the rest of the stage.
   Any solution that triggers on this flag must have a separate "already handled" guard.

4. **`updateStageData` requires `ringkasan`** — this is a required Zod field (not optional).
   Any forced tool call must ensure the model generates a meaningful ringkasan, not garbage.

5. **Model compliance is non-deterministic** — the same prompt instruction produces
   different behavior across runs, models, and context lengths. Gemini 2.5 Flash
   complies with "save incrementally" ~50% of the time.
