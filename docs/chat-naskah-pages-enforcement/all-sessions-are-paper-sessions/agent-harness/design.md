# Harness Plan System: Model-Driven Task Tracking

## Context

E2E test stage 1 (gagasan) revealed a fundamental architectural issue: the UnifiedProcessCard and SidebarQueueProgress render task checkmarks from **hardcoded** definitions in `task-derivation.ts`, while the model has **zero awareness** of these tasks. The model called `updateStageData({})` with empty data because it didn't know what fields to fill. Result: 1/4 checkmarks, despite the model having done the work in its response text.

The deeper problem: hardcoded task breakdowns constrain the model into rigid, hand-designed workflows. The model can't adapt its plan per conversation, can't track its own progress, and can't self-regulate ("have I done enough?").

### References

- [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) — Anthropic's harness pattern: agent reads persistent state (progress file) → works → updates state → next step reads updated state.
- [open-harness](https://github.com/MaxGfeller/open-harness) — AI SDK-based agent harness with multi-step execution, middleware composition, and event streaming.

### Design Principles

From CLAUDE.md CREDO: "AI works better when you give tools and freedom instead of forcing them into rigid, hand-designed workflows — because general learning systems scale better."

- **Task plan (HOW)**: Model-driven, dynamic per conversation. Model decides what to do and in what order.
- **Output Contract (WHAT)**: Skill-defined, validated deterministically at submit time. Required deliverables that must exist in stageData.
- **Stage workflow (14 stages)**: Code-enforced. Linear, mandatory validation. Not negotiable.

## Design Decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Plan persistence | Per-stage (`stageData._plan`) | Plan is property of stage, not individual message. Convex subscription = real-time UI. |
| 2 | Capture mechanism | YAML fence (`plan-spec`) | Works in both search and tools paths. Proven pattern (choice card). No tool call needed. |
| 3 | Update mechanism | Full replace every response | Model re-evaluates plan each turn. Can add/remove/reorder tasks. |
| 4 | Schema | Rich — stage, summary, tasks[] | Stage field = safety check. Summary = dynamic stage description. |
| 5 | Breaking changes | Graceful fallback | Model-driven primary, hardcoded fallback. Zero breaking change. |
| 6 | Submit validation | Deterministic gate | Required fields checked at submit time. Soft failure (model can recover). |
| 7 | Implementation | Separate `pipePlanCapture` | Parallel to `pipeYamlRender`. No coupling with choice card system. |

## Architecture

### Plan Capture Pipeline

```
Model text output (includes ```plan-spec fence)
    ↓
pipeYamlRender (existing — handles yaml-spec for choice cards, passes plan-spec through)
    ↓
pipePlanCapture (NEW — detects ```plan-spec fence)
    ├─→ Parse YAML inside fence
    ├─→ Validate against PlanSpec schema (Zod)
    ├─→ Strip fence from visible text
    ├─→ Emit PLAN_DATA_PART_TYPE part into stream
    └─→ Pass-through all other chunks unchanged
    ↓
Stream iteration loop (route.ts)
    ├─→ Detect PLAN_DATA_PART_TYPE chunk
    ├─→ Accumulate captured plan spec
    └─→ Forward other chunks to client
    ↓
onFinish handler
    ├─→ Strip plan-spec fence from text BEFORE saveAssistantMessage
    ├─→ Save message text (plan-spec already stripped)
    ├─→ Validate spec.stage === currentStage
    └─→ Save to stageData._plan via paperSessions.updatePlan mutation
    ↓
Convex subscription fires → UI updates
```

### Three Stream Paths

Plan capture must work in ALL three stream paths in route.ts:

1. **Primary tools path** (~line 2881): `pipePlanCapture` wraps the stream. Plan captured in iteration loop, persisted in onFinish.
2. **Search path** (~line 2739): No streaming pipeline available. Plan extracted from raw text via regex + YAML parse in onFinish, BEFORE `saveAssistantMessage`.
3. **Fallback stream path** (~line 4145): Same as primary — `pipePlanCapture` wraps the fallback stream. Has its own iteration loop and onFinish.

### Plan Capture Scope

`pipePlanCapture` is applied when the conversation has an active paper stage — not only during `drafting` status. This includes `drafting`, `pending_validation`, and `revision` states, because the model may update its plan during revision responses. The condition is `!!paperStageScope` (has active stage), not `isDraftingStage` (drafting only).

### State Injection (Closed-Loop Feedback)

Every turn, the model receives its current plan in the prompt context:

```
═══ YOUR CURRENT PLAN ═══
Stage: gagasan
Summary: Mengeksplorasi dampak ChatGPT pada siswa SD

Tasks:
  ✅ Cari referensi dampak ChatGPT pada siswa SD [complete]
  🔄 Eksplorasi sudut pandang penelitian [in-progress]
  ⬚ Analisis kelayakan topik [pending]
  ⬚ Tentukan angle spesifik [pending]

Progress: 1/4 complete

IMPORTANT: Emit an updated ```plan-spec``` block in EVERY response
to reflect your current progress.
═══════════════════════════
```

When no plan exists yet:

```
═══ YOUR CURRENT PLAN ═══
No plan yet. You MUST emit a ```plan-spec``` block in this response
to define your task plan for this stage.
═══════════════════════════
```

Injection point: `formatStageData()` in `src/lib/ai/paper-stages/formatStageData.ts`.

### UI Components (Graceful Fallback)

`deriveTaskList()` in `task-derivation.ts` changes internal logic:

1. Check `stageData[stageId]._plan` — if exists and has tasks, build TaskSummary from model's plan
2. If `_plan` absent — fallback to existing hardcoded `STAGE_TASKS` definitions

Downstream consumers unchanged:
- `UnifiedProcessCard.tsx` — receives TaskSummary, renders. Zero changes.
- `SidebarQueueProgress.tsx` — calls `deriveTaskList`, renders. Zero changes.
- `MessageBubble.tsx` — calls `deriveTaskList`, passes to UnifiedProcessCard. Zero changes.

### Output Contract Validation Gate

`submitForValidation` mutation in Convex checks required fields before allowing status transition:

```typescript
const missing = requiredFields.filter(f => !isFieldPresent(stageData[stage][f.field], f.type))
if (missing.length > 0) {
  return {
    success: false,
    error: `Missing required fields: ${missing.map(f => f.field).join(", ")}`,
    missingFields: missing.map(f => f.field),
    hint: "Call updateStageData to save these fields before submitting."
  }
}
```

Soft failure — model receives a successful tool result with `success: false` payload (not a thrown error). Model must check `success` field and recover by calling updateStageData with missing fields, then retrying submit. The system prompt instructs the model on this recovery flow.

## Schemas

### PlanSpec (Zod)

```typescript
// src/lib/ai/harness/plan-spec.ts

const planTaskSchema = z.object({
  label: z.string().min(1),
  status: z.enum(["complete", "in-progress", "pending"]),
})

const planSpecSchema = z.object({
  stage: z.string().min(1),
  summary: z.string().min(1),
  tasks: z.array(planTaskSchema).min(1).max(10),
})

type PlanSpec = z.infer<typeof planSpecSchema>
type PlanTask = z.infer<typeof planTaskSchema>
```

### YAML format (what model emits)

````
```plan-spec
stage: gagasan
summary: "Eksplorasi dampak ChatGPT pada siswa SD"
tasks:
  - label: "Cari referensi tentang dampak ChatGPT"
    status: complete
  - label: "Eksplorasi sudut pandang penelitian"
    status: in-progress
  - label: "Analisis kelayakan topik"
    status: pending
  - label: "Tentukan angle spesifik"
    status: pending
```
````

### Stage Required Fields

```typescript
// convex/paperSessions/stage-required-fields.ts

export const STAGE_REQUIRED_FIELDS: Record<string, {field: string, type: string}[]> = {
  gagasan: [
    { field: "ideKasar", type: "string" },
    { field: "analisis", type: "string" },
    { field: "angle", type: "string" },
  ],
  topik: [
    { field: "definitif", type: "string" },
    { field: "angleSpesifik", type: "string" },
    { field: "researchGap", type: "string" },
  ],
  outline: [
    { field: "sections", type: "array" },
    { field: "totalWordCount", type: "number" },
  ],
  abstrak: [
    { field: "ringkasanPenelitian", type: "string" },
    { field: "keywords", type: "array" },
  ],
  pendahuluan: [
    { field: "latarBelakang", type: "string" },
    { field: "rumusanMasalah", type: "string" },
  ],
  tinjauan_literatur: [
    { field: "kerangkaTeoretis", type: "string" },
    { field: "reviewLiteratur", type: "string" },
  ],
  metodologi: [
    { field: "desainPenelitian", type: "string" },
    { field: "pendekatanPenelitian", type: "string" },
  ],
  hasil: [
    { field: "temuanUtama", type: "array" },
  ],
  diskusi: [
    { field: "interpretasiTemuan", type: "string" },
  ],
  kesimpulan: [
    { field: "ringkasanHasil", type: "string" },
    { field: "jawabanRumusanMasalah", type: "array" },
  ],
  pembaruan_abstrak: [
    { field: "ringkasanPenelitianBaru", type: "string" },
    { field: "perubahanUtama", type: "array" },
  ],
  daftar_pustaka: [
    { field: "entries", type: "array" },
  ],
  lampiran: [
    // No hard requirements — tidakAdaLampiran or items
  ],
  judul: [
    { field: "opsiJudul", type: "array" },
    { field: "judulTerpilih", type: "string" },
  ],
}
```

Note: Required fields are the **minimum** for submit validation. Skills list additional recommended fields that improve quality but don't block submission.

## Prompt Changes

### System Prompt Addition

New section added after `### FUNCTION TOOLS`:

```markdown
### TASK PLAN (HARNESS AWARENESS)

You maintain a task plan for each stage. The plan is YOUR breakdown of
what needs to be done — you decide the tasks, labels, and order.

EVERY response MUST include a ```plan-spec``` block:

​```plan-spec
stage: <current_stage_id>
summary: "<one-line description of what you're working on>"
tasks:
  - label: "<task description>"
    status: complete|in-progress|pending
​```

Rules:
- Emit plan-spec in EVERY response, even search turns
- Update task statuses to reflect actual progress
- You may add, remove, or reorder tasks as the work evolves
- Keep tasks between 2-6 items — enough for progress tracking, not a micro-log
- The plan is shown to the user as a progress indicator — write labels they understand
- "in-progress" = you are working on this in the current response
- "complete" = work is done and data is saved (or will be saved this turn)
- "pending" = not started yet

Your current plan (if any) is injected under "YOUR CURRENT PLAN".
Read it at the start of each response to maintain continuity.

SUBMIT RECOVERY: If submitStageForValidation returns success: false with
missingFields, call updateStageData to save those fields, then retry
submitStageForValidation. Do NOT narrate the error to the user — recover silently.
```

### Skill Output Contract Update Pattern

Each skill's Output Contract changes from ambiguous required/recommended lists to explicit gate-checked vs additional fields:

```markdown
## Output Contract
Required fields — MUST be saved to stageData via updateStageData
before submitStageForValidation will accept:
- fieldName (type) — description

Additional data (save if available, not gate-checked):
- fieldName (type) — description
```

## Files to Create/Modify

### New files
- `src/lib/ai/harness/plan-spec.ts` — PlanSpec schema (Zod), types, PLAN_DATA_PART_TYPE constant
- `src/lib/ai/harness/pipe-plan-capture.ts` — Stream transformer that detects, parses, strips plan-spec fences
- `convex/paperSessions/stage-required-fields.ts` — Required fields per stage for validation gate

### Modified files
- `src/app/api/chat/route.ts` — Pipe pipePlanCapture in all 3 stream paths (primary, search, fallback), capture PLAN_DATA_PART in stream loop, persist in onFinish
- `src/lib/ai/paper-stages/formatStageData.ts` — Add formatPlanContext() for state injection
- `src/lib/paper/task-derivation.ts` — deriveTaskList() checks _plan first, falls back to hardcoded
- `convex/paperSessions.ts` — Add updatePlan mutation, add validation gate to submitForValidation
- `.references/system-prompt-skills-active/updated-6/system-prompt.md` — Add TASK PLAN section
- `.references/system-prompt-skills-active/updated-6/01-gagasan-skill.md` through `14-judul-skill.md` — Align Output Contracts

## Edge Cases

### Model doesn't emit plan-spec
- `pipePlanCapture` emits nothing. stageData._plan unchanged.
- UI falls back to hardcoded tasks from `task-derivation.ts`.
- Next turn: "YOUR CURRENT PLAN" context reminds model to emit plan.
- System never breaks.

### Model emits malformed YAML
- `pipePlanCapture` logs warning, skips. No PLAN_DATA_PART emitted.
- Same as "no plan" — fallback to hardcoded.

### Model emits plan with wrong stage
- onFinish validates `spec.stage === currentStage`. Rejects mismatch.
- Plan not saved. Previous plan (if any) preserved.

### Model submits without required fields
- `submitForValidation` returns soft error with missing field list.
- Model receives error in tool result. Can call updateStageData then retry.
- Artifact-enforcer chain doesn't break — model gets another step.

### Edit/resend resets stageData
- `resetStageDataForEditResend` already clears stageData fields.
- _plan should also be cleared — model will re-emit plan in next response.
- Add `_plan` to cleared fields in the reset mutation.

## Not In Scope

- Real-time per-task progress during streaming (tasks update after full response, via Convex subscription)
- Model-defined stage descriptions replacing hardcoded sidebar labels (future enhancement)
- Removing hardcoded `STAGE_TASKS` from task-derivation.ts (kept as fallback indefinitely)
