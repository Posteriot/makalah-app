# Context: Living Plan — Transparent Multi-Step Execution

> Handoff document for a new session on the same branch.
> Factual conditions, verified codebase state, and observed problems only.
> No solutions proposed.

---

## Goal

Make the AI model's work **transparent and step-by-step** — like Claude Code's
terminal output where each action is narrated, executed, and its result visible
before moving to the next step. The user should see a "living plan" where tasks
check off individually as the model works through them, not all at once at the end.

---

## Current Behavior (Observed, Reproducible)

### The "bulk save" pattern

1. **Turn 1 (search turn):** User provides topic. Search orchestrator runs.
   `referensiAwal` auto-persisted by `appendSearchReferences` (code-level, no
   model cooperation). **No other stageData fields saved** — compose phase has
   no tools. UnifiedProcessCard shows `1/4`.

2. **Turn 2 (tools-available turn):** User responds (e.g., selects choice card).
   Model discusses, presents analysis. Tools available but model does NOT call
   `updateStageData`. Card still shows `1/4`.

3. **Turn 3 (tools-available turn):** User confirms. Model calls `updateStageData`
   with ALL fields at once (ideKasar + analisis + angle + ringkasan), then
   immediately calls `createArtifact` + `submitStageForValidation`. Card jumps
   from `1/4` to `4/4` in one frame.

### What the user sees

- Tasks `1/4` for multiple turns (only referensiAwal from auto-persist)
- Then suddenly `4/4` — no visibility into when each task completed
- No "intelligence" visible — model appears to do nothing, then dumps everything

### What the user WANTS to see

- `1/4` — Cari referensi awal (auto-persist, already works)
- Model narrates: "Saya akan mengeksplorasi ide kasar berdasarkan referensi..."
- `2/4` — Eksplorasi ide (saved incrementally)
- Model narrates: "Sekarang saya analisis kelayakan topik ini..."
- `3/4` — Analisis feasibility (saved incrementally)
- Model narrates: "Saya tentukan angle spesifik..."
- `4/4` — Tentukan angle (saved incrementally)
- Each step visible, each save transparent, like watching Claude Code work

---

## Root Causes (Verified Against Codebase)

### 1. Prompt instructs "save after discussion matures"

`paper-mode-prompt.ts` line ~294:
```
Save progress with updateStageData() after discussion is mature
```
And:
```
MUST create artifact with createArtifact() in the SAME TURN as
updateStageData, BEFORE submitStageForValidation
```

Model is told to save + artifact + submit all in one turn. No instruction
to save incrementally per-task.

### 2. `ringkasan` is required in `updateStageData`

`paper-tools.ts` line 147:
```typescript
ringkasan: z.string().max(280).describe("REQUIRED! ...")
```

No `.optional()`. Model cannot "just save ideKasar" without also generating
a ringkasan. This creates friction for partial saves — model defers until
it has everything ready including a meaningful summary.

### 3. No code-level enforcement for incremental saves

`appendSearchReferences` succeeds because it's **server-side, automatic,
zero model cooperation**. But for `ideKasar`, `analisis`, `angle` — there is
no equivalent mechanism. Everything depends on model voluntarily calling
`updateStageData`.

### 4. toolChoice is undefined (model decides)

`route.ts` line ~2242: `toolChoice: forcedToolChoice` where `forcedToolChoice`
is `undefined` in most turns. Model decides whether to call tools or just
generate text. It consistently chooses to defer `updateStageData` until the
final turn.

---

## Existing Mechanisms That Could Be Leveraged

### `prepareStep` — proven pattern for forced tool calls

Two working implementations in the codebase:

**deterministicSyncPrepareStep** (route.ts:2250-2268):
```typescript
// Step 0: force getCurrentPaperState
// Step 1: force no tools (plain answer)
```

**buildDeterministicExactSourcePrepareStep** (exact-source-guardrails.ts:179-230):
```typescript
// Step 0: force inspectSourceDocument
// Step 1: force no tools
```

Both use the same pattern:
```typescript
prepareStep: ({ stepNumber }) => {
  if (stepNumber === 0) return {
    toolChoice: { type: "tool", toolName: "targetTool" },
    activeTools: ["targetTool"],
  }
  if (stepNumber === 1) return {
    toolChoice: "none",
    activeTools: [],
  }
  return undefined
}
```

### `appendSearchReferences` — proven auto-save pattern

`convex/paperSessions.ts:768-855`. Server-side, fire-and-forget, called from
`onFinish` callback in route.ts:2353. Merges into stageData without model
cooperation. Auto-persists `referensiAwal` (gagasan) and `referensiPendukung`
(topik) after search.

### `updateStageData` is merge-based

`convex/paperSessions.ts:703-709`:
```typescript
const updatedStageData = {
  ...session.stageData,
  [stageKey]: {
    ...existingStageData,   // Keep existing fields
    ...truncatedData,       // Merge in new fields
  },
}
```

Partial saves work — only provided fields overwrite. Other fields preserved.

### `maxToolSteps: 5` — model can multi-step

Default 5 tool calls per turn. Model CAN call updateStageData multiple times
if instructed/forced to do so.

### Stream parts — UI already renders tool calls

UnifiedProcessCard's PROSES section renders `ToolStateIndicator` for each
tool call. Search status renders via `SearchStatusIndicator`. The UI
infrastructure for showing step-by-step execution already exists.

---

## What Was Attempted Previously and Reverted

(From `model-compliance-save-after-search.md` — verified still accurate)

### 1. Prompt instruction changes (reverted)
- Added "SAVE PROGRESS INCREMENTALLY" to GENERAL RULES
- Added "MANDATORY — SAVE PROGRESS NOW" to getFunctionToolsModeNote
- **Result:** Model ignored instructions ~50% of the time

### 2. Plan context injection (reverted)
- Injected task list with "Tasks: 0/4 complete" into system prompt
- **Result:** Model verbalized the plan to user instead of acting on it

### 3. prepareStep force updateStageData (reverted before thorough testing)
- Used prepareStep to force updateStageData at step 0
- Guard: `searchAlreadyDone && !stageAlreadySaved && stageStatus === "drafting"`
- **Result:** Not tested thoroughly. Concern about `searchAlreadyDone` permanence
  requiring additional guard. Reverted preemptively.

---

## Relevant Files

| File | Role | Lines of interest |
|------|------|-------------------|
| `src/app/api/chat/route.ts` | Main chat route, streamText, tool routing | prepareStep:2250-2268, toolChoice:2242, maxToolSteps:2247 |
| `src/lib/ai/paper-tools.ts` | Tool definitions (updateStageData schema) | updateStageData:101-243, ringkasan required:147 |
| `src/lib/ai/paper-mode-prompt.ts` | System prompt instructions | "save after mature":~294, tool sequence:~294 |
| `src/lib/ai/paper-search-helpers.ts` | getFunctionToolsModeNote | Mode note injection:119-124 |
| `src/lib/ai/exact-source-guardrails.ts` | prepareStep pattern reference | buildDeterministicExactSourcePrepareStep:179-230 |
| `convex/paperSessions.ts` | Convex mutations | updateStageData:630-760, appendSearchReferences:768-855 |
| `convex/paperSessions/stageDataWhitelist.ts` | Field whitelist per stage | gagasan fields:2-5 |
| `convex/schema.ts` | Stage field types | gagasan schema:537-560 |
| `src/lib/paper/task-derivation.ts` | Task list derivation from stageData | deriveTaskList, TaskItem type |
| `src/components/chat/UnifiedProcessCard.tsx` | UI card (already built) | LANGKAH + PROSES sections |
| `src/components/chat/MessageBubble.tsx` | Card integration | showUnifiedCard guard:764, taskSummary:255-269 |

---

## Key Constraints

1. **Compose phase cannot have tools** — search orchestrator design. Search and
   tool calls are deliberately separated into different turns.

2. **`ringkasan` is required** — any forced `updateStageData` call must ensure
   model generates a meaningful ringkasan, not garbage.

3. **`searchAlreadyDone` is permanent** — once stageData has search evidence,
   this flag stays true. Any trigger based on it needs a "already handled" guard.

4. **Model compliance is non-deterministic** — same prompt produces different
   behavior across runs. Prompt-only solutions have ~50% success rate.

5. **UnifiedProcessCard already renders correctly** — if stageData updates
   incrementally, the UI will automatically reflect it. No UI changes needed
   for task progress — only the data pipeline needs to change.

---

## Branch State

Branch: `feature/plan-task-queue-components`
Working tree: `.worktrees/plan-task-queue-components`

UnifiedProcessCard is fully implemented and tested:
- Collapsed/expanded states working
- LANGKAH section reflects stageData in real-time (Convex subscription)
- PROSES section shows tool calls and search status
- Amber loading indicator in header
- All tests pass, lint clean

The UI is ready — it will automatically show incremental progress if the
data pipeline saves incrementally. The work needed is entirely in the
tools calling / prompt / enforcement layer.
