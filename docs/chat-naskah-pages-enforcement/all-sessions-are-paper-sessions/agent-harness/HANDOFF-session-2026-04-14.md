# Handoff: Harness Plan System — Session 2026-04-14

## Read First
- Design doc: `agent-harness/design.md`
- Implementation plan: `agent-harness/implementation-plan.md`
- Test checklist: `agent-harness/test-review-audit-checklist.md`
- Git log: `git log --oneline -20` on branch `chat-naskah-pages-enforcement`

## What Was Done This Session

### Harness Plan System — Implemented + Deployed to Dev

Core system:
- `pipePlanCapture` stream transformer (fenced + unfenced detection via state machine)
- `PlanSpec` schema: stage, summary, tasks[]{label, status}
- Plan persisted to `stageData._plan` via `updatePlan` mutation
- `formatStageData` injects plan into model prompt each turn
- `deriveTaskList` reads `_plan` first, falls back to hardcoded `STAGE_TASKS`
- Client-side plan-spec stripping in `MessageBubble.tsx` (regex on publicDisplayText)
- Server-side `composedText` fallback extraction in orchestrator onFinish

### Validation Gate
- `submitForValidation` checks required fields before allowing submit
- `stage_required_fields.ts` defines minimum deliverables per stage
- Tool handler checks `success: false` and returns retryable error

### Plan Completion Gate
- `createArtifact` blocked when `_plan` has incomplete tasks
- Log: `[PLAN-GATE] BLOCKED`

### Enforcer Fix
- `draftingChoiceArtifactEnforcer` only activates on `finalize_stage`, NOT `continue_discussion`
- Model free to discuss incrementally without forced artifact chain

### Gagasan First Turn
- Search router blocks auto-search on gagasan first turn (no plan, no stageData)
- Model responds immediately (~5s vs ~30s) with discussion + search choice card

### UI
- 3 task states: ○ pending (muted), 🔄 in-progress (active), ✅ complete (checkmark)
- `UnifiedProcessCard` + `SidebarQueueProgress` render all 3 states

### Skills Updated
- All 14 skills: Output Contract aligned with validation gate
- gagasan + topik: Incremental Discussion Flow (1 task = 1 choice card)
- outline: Multi-confirmation review
- 11 review stages: Direction + Finalize flow

### Schema
- `_plan: v.optional(v.any())` added to all 14 stage data validators

### Observability
- `[USER-INPUT]` — user prompt + choice selections
- `[USER-ACTION]` — approve/revise in Convex
- `[PLAN-CONTEXT]` — plan injection status with timestamp
- `[PLAN-CAPTURE]` — capture/persist/fail with elapsed time
- `[PLAN-GATE]` — createArtifact blocked by incomplete plan
- `[HARNESS-FLOW]` — gagasan first-turn flow detection
- `[UNIFIED-PROCESS-UI]` — FIRST-RENDER + source (model-driven/hardcoded)

## Open Bugs (Fix Next Session)

### Bug 1: Infinite Retry Loop on Finalize
**Severity:** Critical
**Symptoms:** After `finalize_stage` choice card, enforcer starts chain → `updateStageData` tool handler calls `paperSessions.getByConversation` → fails 20+ times → infinite retry loop. Convex shows 4x `updateStageData keys=[]` concurrent calls.
**Likely cause:** Convex rate limit or OCC conflict from concurrent mutations. The enforcer forces `updateStageData` and model sends empty data, triggering rapid retries.
**Where to investigate:** 
- `src/lib/ai/paper-tools.ts` — `updateStageData` execute handler, `retryMutation` logic
- Why is `getByConversation` failing? Check Convex dashboard for error details.
- Consider: should enforcer skip `updateStageData` if data was already saved in a previous step?

### Bug 2: Model Emits finalize_stage with Incomplete Plan
**Severity:** Medium
**Symptoms:** `[PLAN-CONTEXT] progress=2/4` but model emits choice card with `workflowAction: "finalize_stage"`. Plan gate would block at `createArtifact`, but chain gets stuck at Bug 1 before reaching gate.
**Root cause:** Instruction compliance — model ignores plan progress. Gemini Flash doesn't follow "only finalize when all tasks complete."
**Possible fix:** Add plan completion check in the enforcer itself — if plan incomplete AND action is `finalize_stage`, downgrade to `continue_discussion` (don't activate enforcer).

### Bug 3: Model Doesn't Emit plan-spec in Tools Path
**Severity:** Medium  
**Symptoms:** Turn 1 and Turn 3: `[PLAN-CAPTURE] no plan-spec detected in response`. Model emits plan in search path (composedText fallback works) but NOT in tools path. `pipePlanCapture` state machine doesn't trigger.
**Likely cause:** Model emits unfenced plan that's too short or differently formatted for state machine detection. Or model simply doesn't emit plan in non-search turns.
**Where to investigate:** Check if model actually emits plan text in tools path responses. May need to add debug logging in `pipePlanCapture` state machine transitions.

### Bug 4: Plan Progress Not Updated Across Turns
**Severity:** Medium
**Symptoms:** Plan stays at 2/4 across turns 3 and 4. Model doesn't re-emit plan-spec with updated statuses.
**Root cause:** Model doesn't comply with "emit plan-spec in EVERY response." Combined with Bug 3 (plan not captured in tools path), plan is stale.
**Possible fix:** The plan context injection already shows progress — if model sees 2/4 but doesn't update, this is instruction compliance. Consider: should the harness auto-advance plan tasks based on tool calls? (e.g., if `updateStageData` saved `ideKasar`, auto-mark related plan task as complete)

## Deploy State
- Dev DB `wary-ferret-59`: all changes deployed (Convex functions + system prompt v41+ + 14 skills)
- Prod DB `basic-oriole-337`: untouched

## Key Files Modified This Session
- `src/lib/ai/harness/plan-spec.ts` — schema + constants
- `src/lib/ai/harness/pipe-plan-capture.ts` — stream transformer (state machine)
- `src/app/api/chat/route.ts` — pipeline integration, enforcer fix, gagasan first turn, plan gate, observability
- `src/lib/ai/paper-tools.ts` — submitForValidation gate check
- `src/lib/ai/paper-stages/formatStageData.ts` — plan context injection
- `src/lib/paper/task-derivation.ts` — model-driven + fallback + in-progress state
- `src/lib/ai/web-search/orchestrator.ts` — pipePlanCapture in compose stream + composedText fallback
- `src/lib/ai/web-search/types.ts` — capturedPlanSpec in WebSearchResult
- `src/components/chat/MessageBubble.tsx` — client-side plan stripping + FIRST-RENDER log
- `src/components/chat/UnifiedProcessCard.tsx` — in-progress icon + styling
- `src/components/chat/sidebar/SidebarQueueProgress.tsx` — in-progress pulse + styling
- `convex/paperSessions.ts` — updatePlan mutation + validation gate
- `convex/paperSessions/stage_required_fields.ts` — required fields per stage
- `convex/paperSessions/types.ts` — planField spread
- `convex/schema.ts` — _plan field in all 14 inline stage schemas
- `.references/system-prompt-skills-active/updated-6/` — system prompt + 14 skills
- `scripts/deploy-skills-dev.py` — CHANGE_NOTE + Exception catch fix
