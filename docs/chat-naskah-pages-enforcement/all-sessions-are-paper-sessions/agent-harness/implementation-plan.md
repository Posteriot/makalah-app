# Harness Plan System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable model-driven task tracking via plan-spec fence capture, replacing hardcoded task definitions as primary source while keeping them as fallback.

**Architecture:** Model emits `plan-spec` YAML fence in every response → `pipePlanCapture` stream transformer detects/parses/strips → harness persists to `stageData._plan` → UI reads `_plan` first, falls back to hardcoded `STAGE_TASKS`. Submit validation gate checks required fields exist in stageData before allowing stage submission.

**Tech Stack:** TypeScript, Zod, Convex mutations, AI SDK streaming, YAML parsing (js-yaml)

**Task Ordering Note (from audit):** System prompt + skill updates (Tasks 8-9) must be deployed BEFORE the validation gate (Task 3) goes live. Otherwise the model hits the gate without knowing how to recover. Recommended execution: Tasks 1-2 (schema, no runtime impact) → Tasks 8-9 (prompt updates) → Task 3 (Convex gate) → Tasks 4-6 (integration) → Task 7 (verify) → Task 10-11 (deploy + test).

---

### Task 1: PlanSpec Schema + Types

**Files:**
- Create: `src/lib/ai/harness/plan-spec.ts`

**Step 1: Create the schema file**

```typescript
import { z } from "zod"

// ============================================================================
// CONSTANTS
// ============================================================================

export const PLAN_DATA_PART_TYPE = "plan-data-part" as const
export const PLAN_FENCE_OPEN = "```plan-spec"
export const PLAN_FENCE_CLOSE = "```"

// ============================================================================
// SCHEMA
// ============================================================================

export const planTaskSchema = z.object({
  label: z.string().min(1),
  status: z.enum(["complete", "in-progress", "pending"]),
})

export const planSpecSchema = z.object({
  stage: z.string().min(1),
  summary: z.string().min(1),
  tasks: z.array(planTaskSchema).min(1).max(10),
})

// ============================================================================
// TYPES
// ============================================================================

export type PlanSpec = z.infer<typeof planSpecSchema>
export type PlanTask = z.infer<typeof planTaskSchema>

export type PlanDataPart = {
  type: typeof PLAN_DATA_PART_TYPE
  data: { spec: PlanSpec }
}
```

**Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/lib/ai/harness/plan-spec.ts` (or full project check)

**Step 3: Commit**

```
feat(harness): add PlanSpec schema and types
```

---

### Task 2: pipePlanCapture Stream Transformer

**Files:**
- Create: `src/lib/ai/harness/pipe-plan-capture.ts`
- Reference: `src/lib/ai/harness/plan-spec.ts`

**Step 1: Create the transformer**

The transformer reads a `ReadableStream`, detects `plan-spec` fences in text-delta chunks, parses YAML, validates with Zod, emits `PlanDataPart`, and strips the fence from visible text. All non-plan chunks pass through unchanged.

```typescript
import yaml from "js-yaml"
import {
  PLAN_DATA_PART_TYPE,
  PLAN_FENCE_OPEN,
  PLAN_FENCE_CLOSE,
  planSpecSchema,
  type PlanDataPart,
} from "./plan-spec"

/**
 * Stream transformer that detects ```plan-spec fences in text-delta chunks,
 * parses YAML, validates, strips fence from visible text, and emits
 * PLAN_DATA_PART_TYPE parts.
 *
 * Non-plan chunks pass through unchanged.
 * Malformed YAML is logged and skipped — never breaks the stream.
 */
export function pipePlanCapture(
  input: ReadableStream<unknown>
): ReadableStream<unknown> {
  let buffer = ""
  let insideFence = false
  let fenceContent = ""

  return new ReadableStream({
    async start(controller) {
      const reader = input.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            // Flush remaining buffer as text if we have any
            if (buffer.length > 0 && !insideFence) {
              controller.enqueue({
                type: "text-delta",
                textDelta: buffer,
              })
              buffer = ""
            }
            controller.close()
            break
          }

          const chunk = value as { type?: string; textDelta?: string }

          // Only intercept text-delta chunks
          if (chunk.type !== "text-delta" || typeof chunk.textDelta !== "string") {
            controller.enqueue(value)
            continue
          }

          // Append to buffer for fence detection
          buffer += chunk.textDelta

          // Process buffer for fence boundaries
          while (buffer.length > 0) {
            if (!insideFence) {
              const fenceStart = buffer.indexOf(PLAN_FENCE_OPEN)

              if (fenceStart === -1) {
                // No fence found — flush safe portion
                // Keep last chars in case fence is partially arrived
                const safeLength = Math.max(0, buffer.length - PLAN_FENCE_OPEN.length)
                if (safeLength > 0) {
                  controller.enqueue({
                    type: "text-delta",
                    textDelta: buffer.slice(0, safeLength),
                  })
                  buffer = buffer.slice(safeLength)
                }
                break
              }

              // Fence found — flush text before fence
              if (fenceStart > 0) {
                controller.enqueue({
                  type: "text-delta",
                  textDelta: buffer.slice(0, fenceStart),
                })
              }

              // Enter fence mode
              insideFence = true
              fenceContent = ""
              buffer = buffer.slice(fenceStart + PLAN_FENCE_OPEN.length)
              // Skip leading newline after fence open
              if (buffer.startsWith("\n")) {
                buffer = buffer.slice(1)
              }
            }

            if (insideFence) {
              // Look for closing fence (``` on its own line or preceded by newline)
              const closePatterns = ["\n```\n", "\n```"]
              let closeIdx = -1
              let closeLen = 0

              for (const pattern of closePatterns) {
                const idx = buffer.indexOf(pattern)
                if (idx !== -1 && (closeIdx === -1 || idx < closeIdx)) {
                  closeIdx = idx
                  closeLen = pattern.length
                }
              }

              if (closeIdx === -1) {
                // Fence not closed yet — accumulate and wait
                fenceContent += buffer
                buffer = ""
                break
              }

              // Fence closed — extract content
              fenceContent += buffer.slice(0, closeIdx)
              buffer = buffer.slice(closeIdx + closeLen)
              insideFence = false

              // Parse and validate
              try {
                const parsed = yaml.load(fenceContent.trim())
                const result = planSpecSchema.safeParse(parsed)
                if (result.success) {
                  const part: PlanDataPart = {
                    type: PLAN_DATA_PART_TYPE,
                    data: { spec: result.data },
                  }
                  controller.enqueue(part)
                  console.info(
                    `[PLAN-CAPTURE] parsed stage=${result.data.stage} tasks=${result.data.tasks.length}`
                  )
                } else {
                  console.warn(
                    `[PLAN-CAPTURE] validation failed:`,
                    result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`)
                  )
                }
              } catch (e) {
                console.warn(`[PLAN-CAPTURE] YAML parse error:`, e)
              }

              fenceContent = ""
            }
          }
        }
      } catch (err) {
        controller.error(err)
      }
    },
  })
}
```

**Step 2: Verify file compiles**

Check: `npx tsc --noEmit` (full project). Ensure `js-yaml` is already a dependency (it likely is — check package.json). If not, install it.

**Step 3: Commit**

```
feat(harness): add pipePlanCapture stream transformer
```

---

### Task 3: Convex — updatePlan Mutation + Validation Gate

**Files:**
- Create: `convex/paperSessions/stage-required-fields.ts`
- Modify: `convex/paperSessions.ts:1118-1152` (submitForValidation)
- Modify: `convex/paperSessions.ts` (add updatePlan mutation, near updateStageData at line 752)

**Step 1: Create stage-required-fields.ts**

```typescript
import type { PaperStageId } from "./constants"

type RequiredField = { field: string; type: "string" | "number" | "array" }

export const STAGE_REQUIRED_FIELDS: Partial<Record<PaperStageId, RequiredField[]>> = {
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
  // lampiran: no hard requirements
  judul: [
    { field: "opsiJudul", type: "array" },
    { field: "judulTerpilih", type: "string" },
  ],
}

export function isFieldPresent(value: unknown, type: string): boolean {
  switch (type) {
    case "string":
      return typeof value === "string" && value.trim().length > 0
    case "number":
      return typeof value === "number" && value > 0
    case "array":
      return Array.isArray(value) && value.length > 0
    default:
      return false
  }
}
```

**Step 2: Add updatePlan mutation to paperSessions.ts**

Add after `updateStageData` mutation (after line ~810). This is a harness-level write, separate from model's updateStageData tool:

```typescript
/**
 * Harness-level mutation: persist model's plan to stageData._plan.
 * Called by route.ts onFinish, NOT by model tool call.
 */
export const updatePlan = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        stage: v.string(),
        plan: v.any(),
    },
    handler: async (ctx, args) => {
        const { session } = await requirePaperSessionOwner(ctx, args.sessionId);

        if (session.currentStage !== args.stage) {
            console.warn(`[PAPER][updatePlan] stage mismatch: current=${session.currentStage} plan=${args.stage} — skipped`);
            return { success: false, reason: "stage_mismatch" };
        }

        const stageData = { ...(session.stageData ?? {}) } as Record<string, Record<string, unknown>>;
        const currentStageData = { ...(stageData[args.stage] ?? {}) };
        currentStageData._plan = args.plan;
        stageData[args.stage] = currentStageData;

        await ctx.db.patch(args.sessionId, {
            stageData,
            updatedAt: Date.now(),
        });

        console.info(`[PAPER][updatePlan] stage=${args.stage} tasks=${args.plan?.tasks?.length ?? 0}`);
        return { success: true };
    },
});
```

**Step 3: Add validation gate to submitForValidation**

Modify `submitForValidation` (line 1118). First, add a **static import** at the top of `paperSessions.ts` (NOT dynamic import — Convex V8 runtime does not reliably support dynamic `import()` inside handlers):

```typescript
// At top of convex/paperSessions.ts, with other imports:
import { STAGE_REQUIRED_FIELDS, isFieldPresent } from "./paperSessions/stage-required-fields";
```

Then add required fields check AFTER artifact guard, BEFORE status transition:

```typescript
// After the artifactId guard (line 1139), before the status transition (line 1142):

// ════════════════════════════════════════════════════════════════
// Gate: Check required fields exist in stageData before submit
// ════════════════════════════════════════════════════════════════
const requiredFields = STAGE_REQUIRED_FIELDS[currentStage];
if (requiredFields && requiredFields.length > 0) {
    const missing = requiredFields.filter(f => !isFieldPresent(currentStageData?.[f.field], f.type));
    if (missing.length > 0) {
        const missingNames = missing.map(f => f.field);
        console.warn(`[PAPER][submitForValidation] gate BLOCKED stage=${currentStage} missing=[${missingNames.join(",")}]`);
        return {
            success: false,
            stage: currentStage,
            error: `Cannot submit: missing required fields: ${missingNames.join(", ")}. Call updateStageData to save these fields first.`,
            missingFields: missingNames,
        };
    }
}
```

**Step 4: Verify Convex compiles**

Run: `npx convex dev` — check for type errors and successful deployment to dev.

**Step 5: Commit**

```
feat(harness): add updatePlan mutation + validation gate on submitForValidation
```

---

### Task 4: Integrate pipePlanCapture into route.ts

**Files:**
- Modify: `src/app/api/chat/route.ts`
  - Import section (line 1-88)
  - Stream pipeline (line ~3413)
  - Stream iteration loop (line ~3431)
  - onFinish handler (line ~2903)
  - Also: search path onFinish (line ~2780)

**Step 1: Add imports**

At the top of route.ts, add:

```typescript
import { pipePlanCapture } from "@/lib/ai/harness/pipe-plan-capture"
import { PLAN_DATA_PART_TYPE, type PlanSpec } from "@/lib/ai/harness/plan-spec"
```

**Step 2: Pipe pipePlanCapture after pipeYamlRender (PRIMARY path)**

At line ~3413, change. NOTE: use `!!paperStageScope` (has active paper stage), NOT `isDraftingStage` (drafting only). Plan capture must work in drafting, pending_validation, AND revision states — model may update plan during revision.

```typescript
// Before:
const yamlTransformedStream = isDraftingStage
  ? pipeYamlRender(uiStream)
  : uiStream

// After:
const yamlTransformedStream = isDraftingStage
  ? pipeYamlRender(uiStream)
  : uiStream
const hasPaperStage = !!paperStageScope
const planTransformedStream = hasPaperStage
  ? pipePlanCapture(yamlTransformedStream)
  : yamlTransformedStream
```

Update the subsequent code to use `planTransformedStream` instead of `yamlTransformedStream`.

**Step 3: Declare capturedPlanSpec variable**

Near `capturedChoiceSpec` declaration (before the stream iteration loop):

```typescript
let capturedPlanSpec: PlanSpec | null = null
```

**Step 4: Capture PLAN_DATA_PART in stream iteration loop**

In the loop (line ~3431), add a check for plan data parts alongside the existing SPEC_DATA_PART_TYPE check:

```typescript
// After the existing SPEC_DATA_PART_TYPE block for choice cards:
if ((chunk as { type?: string }).type === PLAN_DATA_PART_TYPE) {
  try {
    const data = (chunk as { data?: { spec?: PlanSpec } }).data
    if (data?.spec) {
      capturedPlanSpec = data.spec
    }
  } catch { /* plan capture error — non-critical */ }
}
```

**Step 5: Persist plan in onFinish (tools path)**

In the onFinish handler (~line 2903), after message persistence and before telemetry, add:

```typescript
// Persist captured plan to stageData
if (capturedPlanSpec && paperSession?._id && paperStageScope) {
  try {
    await fetchMutationWithToken(api.paperSessions.updatePlan, {
      sessionId: paperSession._id,
      stage: paperStageScope,
      plan: capturedPlanSpec,
    })
    console.info(`[PLAN-CAPTURE] persisted stage=${paperStageScope} tasks=${capturedPlanSpec.tasks.length}`)
  } catch (e) {
    console.warn(`[PLAN-CAPTURE] persist failed:`, e)
  }
}
```

**Step 6: Handle search path (CRITICAL ordering)**

The search path (~line 2739-2872) has no streaming pipeline — text is available in onFinish as `result.text`. Plan must be extracted and text stripped BEFORE `saveAssistantMessage` is called.

In the search path onFinish handler, BEFORE the `saveAssistantMessage` call:

```typescript
// STEP A: Strip plan-spec fence from text FIRST
let searchPathText = rawText
const planFenceRegex = /```plan-spec\n([\s\S]*?)\n```/
const planMatch = searchPathText.match(planFenceRegex)

// STEP B: Extract and persist plan (if found)
let searchPathCapturedPlan: PlanSpec | null = null
if (planMatch && paperSession?._id && paperStageScope) {
  try {
    const parsed = yaml.load(planMatch[1].trim())
    const result = planSpecSchema.safeParse(parsed)
    if (result.success) {
      searchPathCapturedPlan = result.data
      await fetchMutationWithToken(api.paperSessions.updatePlan, {
        sessionId: paperSession._id,
        stage: paperStageScope,
        plan: result.data,
      })
      console.info(`[PLAN-CAPTURE] persisted (search path) stage=${paperStageScope} tasks=${result.data.tasks.length}`)
    }
  } catch (e) {
    console.warn(`[PLAN-CAPTURE] search path parse/persist failed:`, e)
  }
}

// STEP C: Strip fence from text BEFORE saving message
searchPathText = searchPathText.replace(/```plan-spec[\s\S]*?```/g, "").trim()

// STEP D: Now call saveAssistantMessage with cleaned text
await saveAssistantMessage(searchPathText, ...)
```

Also add plan-spec stripping alongside yaml-spec in the tools path text normalization (~line 2949):

```typescript
const normalizedText = rawText
  .replace(/```yaml-spec[\s\S]*?```/g, "")
  .replace(/```plan-spec[\s\S]*?```/g, "")  // ADD THIS
  .trim()
```

**Step 7: Handle FALLBACK stream path**

The fallback stream (~line 4145) has its own `pipeYamlRender`, iteration loop, and onFinish. Apply the SAME changes as the primary path:

```typescript
// At fallback stream creation (~line 4145):
const fallbackYamlStream = isDraftingStage
  ? pipeYamlRender(fallbackUiStream)
  : fallbackUiStream
const fallbackPlanStream = hasPaperStage
  ? pipePlanCapture(fallbackYamlStream)
  : fallbackYamlStream
```

In the fallback iteration loop, add the same `PLAN_DATA_PART_TYPE` chunk capture. In the fallback onFinish, add the same plan persistence logic and text stripping.

**Step 8: Verify compilation + dev server starts**

Run: `npm run dev` and verify no crashes.

**Step 9: Commit**

```
feat(harness): integrate pipePlanCapture into all 3 route.ts stream paths
```

---

### Task 5: State Injection — formatStageData

**Files:**
- Modify: `src/lib/ai/paper-stages/formatStageData.ts:106-129`

**Step 1: Add plan context formatter**

Add a new function in formatStageData.ts:

```typescript
import type { PlanSpec } from "@/lib/ai/harness/plan-spec"

function formatPlanContext(stageData: Record<string, unknown>, currentStage: string): string {
  const currentStageData = (stageData[currentStage] ?? {}) as Record<string, unknown>
  const plan = currentStageData._plan as PlanSpec | undefined

  const lines: string[] = ["═══ YOUR CURRENT PLAN ═══"]

  if (!plan?.tasks?.length) {
    lines.push(
      "No plan yet. You MUST emit a ```plan-spec``` block in this response",
      "to define your task plan for this stage.",
    )
    lines.push("═══════════════════════════")
    return lines.join("\n")
  }

  lines.push(`Stage: ${plan.stage}`)
  lines.push(`Summary: ${plan.summary}`)
  lines.push("")
  lines.push("Tasks:")

  let completed = 0
  for (const task of plan.tasks) {
    const icon = task.status === "complete" ? "✅"
      : task.status === "in-progress" ? "🔄"
      : "⬚"
    lines.push(`  ${icon} ${task.label} [${task.status}]`)
    if (task.status === "complete") completed++
  }

  lines.push("")
  lines.push(`Progress: ${completed}/${plan.tasks.length} complete`)
  lines.push("")
  lines.push("IMPORTANT: Emit an updated ```plan-spec``` block in EVERY response")
  lines.push("to reflect your current progress.")
  lines.push("═══════════════════════════")

  return lines.join("\n")
}
```

**Step 2: Call formatPlanContext in formatStageData**

In `formatStageData` function (line ~106), add the plan context to the output. Add BEFORE the active stage data section so model sees plan first:

```typescript
export function formatStageData(stageData: Record<string, unknown>, currentStage: string): string {
  const sections: string[] = []

  // Plan context (model awareness) — always first
  sections.push(formatPlanContext(stageData, currentStage))

  // Active stage data (existing)
  const activeData = formatActiveStageData(stageData, currentStage)
  if (activeData) sections.push(activeData)

  // Web search references (existing)
  // ... existing code ...

  return sections.filter(Boolean).join("\n\n")
}
```

**Step 3: Verify compilation**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```
feat(harness): inject plan context into model prompt via formatStageData
```

---

### Task 6: UI — deriveTaskList Fallback Logic

**Files:**
- Modify: `src/lib/paper/task-derivation.ts:156-196`

**Step 1: Update deriveTaskList to check _plan first**

```typescript
export function deriveTaskList(
  stageId: PaperStageId,
  stageData: Record<string, unknown>
): TaskSummary {
  const currentStageData = (stageData[stageId] ?? {}) as Record<string, unknown>

  // ── Model-driven path: read from _plan if available ──
  const plan = currentStageData._plan as { tasks?: { label?: string; status?: string }[] } | undefined
  if (plan?.tasks && Array.isArray(plan.tasks) && plan.tasks.length > 0) {
    const tasks: TaskItem[] = plan.tasks
      .filter((t): t is { label: string; status: string } =>
        typeof t.label === "string" && typeof t.status === "string"
      )
      .map((t, i) => ({
        id: `${stageId}.plan-${i}`,
        label: t.label,
        field: `plan-${i}`,
        status: t.status === "complete" ? ("complete" as const) : ("pending" as const),
      }))

    if (tasks.length > 0) {
      return {
        stageId,
        stageLabel: getStageLabel(stageId),
        tasks,
        completed: tasks.filter(t => t.status === "complete").length,
        total: tasks.length,
      }
    }
  }

  // ── Fallback path: hardcoded STAGE_TASKS (existing logic, unchanged) ──
  const definitions = STAGE_TASKS[stageId]
  if (!definitions) {
    return {
      stageId,
      stageLabel: getStageLabel(stageId),
      tasks: [],
      completed: 0,
      total: 0,
    }
  }

  const lampiranOverride =
    stageId === "lampiran" && currentStageData.tidakAdaLampiran === true

  const tasks: TaskItem[] = definitions.map((def) => {
    const complete = lampiranOverride || isFieldComplete(currentStageData[def.field], def.type)
    return {
      id: `${stageId}.${def.field}`,
      label: def.label,
      field: def.field,
      status: complete ? ("complete" as const) : ("pending" as const),
    }
  })

  const completed = tasks.filter((t) => t.status === "complete").length
  return {
    stageId,
    stageLabel: getStageLabel(stageId),
    tasks,
    completed,
    total: tasks.length,
  }
}
```

**Step 2: Verify compilation + no type errors**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```
feat(harness): deriveTaskList reads model _plan first, falls back to hardcoded
```

---

### Task 7: Edit/Resend — Clear _plan on Reset

**Files:**
- Modify: `convex/paperSessions.ts` — `resetStageDataForEditResend` mutation (around line 700-747)

**Step 1: Verify _plan is already cleared**

The existing `resetStageDataForEditResend` clears ALL stageData fields except `revisionCount` (line 735):

```typescript
updatedStageData[currentStage] = { revisionCount };
```

This already clears `_plan` since it replaces the entire stage data object. **No code change needed** — just verify this behavior.

**Step 2: Commit (if any change was needed)**

Skip if no change needed. Document verification in the commit for Task 8.

---

### Task 8: System Prompt Update

**Files:**
- Modify: `.references/system-prompt-skills-active/updated-6/system-prompt.md`

**Step 1: Add TASK PLAN section**

After the `### FUNCTION TOOLS` section (around line 260), add:

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

**Step 2: Update FUNCTION TOOLS section**

In the existing `INCREMENTAL PROGRESS` line (line ~258), update:

```markdown
INCREMENTAL PROGRESS: Call updateStageData() to save required fields (see Output Contract in stage skill). Your plan-spec tracks task progress. Required fields are validated at submit time — submission will fail if required fields are missing.
```

**Step 3: Commit**

```
feat(harness): add TASK PLAN section to system prompt
```

---

### Task 9: Update All 14 Stage Skills — Output Contract Alignment

**Files:**
- Modify: `.references/system-prompt-skills-active/updated-6/01-gagasan-skill.md` through `14-judul-skill.md`

**Step 1: Update each skill's Output Contract**

Replace the current `## Output Contract` section in each skill with the aligned version. Pattern:

```markdown
## Output Contract
Required fields — MUST be saved to stageData via updateStageData
before submitStageForValidation will accept:
- fieldName (type) — description

Additional data (save if available, not gate-checked):
- fieldName (type) — description
```

Per-skill updates (required fields match `stage-required-fields.ts`):

**01-gagasan-skill.md:**
```
Required (gate-checked):
- ideKasar (string) — refined core idea
- analisis (string) — feasibility assessment
- angle (string) — chosen research perspective

Additional:
- novelty (string) — what makes this approach novel
- referensiAwal (array) — initial references (auto-saved by search)
```

**02-topik-skill.md:**
```
Required (gate-checked):
- definitif (string) — definitive topic statement
- angleSpesifik (string) — specific research angle
- researchGap (string) — identified research gap

Additional:
- argumentasiKebaruan (string) — novelty argumentation
- referensiPendukung (array) — supporting references
```

**03-outline-skill.md:**
```
Required (gate-checked):
- sections (array) — outline sections with IDs, titles, levels
- totalWordCount (number) — estimated total word count

Additional:
- completenessScore (number) — self-assessed completeness
```

**04-abstrak-skill.md:**
```
Required (gate-checked):
- ringkasanPenelitian (string) — research summary text
- keywords (array) — keyword list

Additional:
- wordCount (number) — abstract word count
```

**05-pendahuluan-skill.md:**
```
Required (gate-checked):
- latarBelakang (string) — background context
- rumusanMasalah (string) — problem formulation

Additional:
- researchGapAnalysis (string) — research gap analysis
- tujuanPenelitian (string) — research objectives
- sitasiAPA (array) — APA citations
```

**06-tinjauan-literatur-skill.md:**
```
Required (gate-checked):
- kerangkaTeoretis (string) — theoretical framework
- reviewLiteratur (string) — literature review synthesis

Additional:
- gapAnalysis (string) — gap analysis
- referensi (array) — collected references
```

**07-metodologi-skill.md:**
```
Required (gate-checked):
- desainPenelitian (string) — research design
- pendekatanPenelitian (string) — research approach

Additional:
- metodePerolehanData (string) — data collection method
- teknikAnalisis (string) — analysis technique
```

**08-hasil-skill.md:**
```
Required (gate-checked):
- temuanUtama (array) — key findings

Additional:
- metodePenyajian (string) — presentation method
- dataPoints (array) — data points
```

**09-diskusi-skill.md:**
```
Required (gate-checked):
- interpretasiTemuan (string) — findings interpretation

Additional:
- perbandinganLiteratur (string) — literature comparison
- implikasiTeoretis (string) — theoretical implications
- keterbatasanPenelitian (string) — research limitations
```

**10-kesimpulan-skill.md:**
```
Required (gate-checked):
- ringkasanHasil (string) — results summary
- jawabanRumusanMasalah (array) — answers to research questions

Additional:
- saranPeneliti (string) — researcher recommendations
```

**11-pembaruan-abstrak-skill.md:**
```
Required (gate-checked):
- ringkasanPenelitianBaru (string) — updated abstract text
- perubahanUtama (array) — list of significant changes

Additional:
- keywordsBaru (array) — updated keywords
- wordCount (number) — updated word count
```

**12-daftar-pustaka-skill.md:**
```
Required (gate-checked):
- entries (array) — compiled bibliography entries

Additional:
- totalCount (number) — total entry count
```

**13-lampiran-skill.md:**
```
Required (gate-checked):
- (none — lampiran may legitimately be empty)

Additional:
- items (array) — appendix items
- tidakAdaLampiran (boolean) — confirm no appendix needed
```

**14-judul-skill.md:**
```
Required (gate-checked):
- opsiJudul (array) — title options
- judulTerpilih (string) — selected title

Additional:
- alasanPemilihan (string) — selection rationale
```

**Step 2: Update Guardrails in each skill**

Replace any instance of:
```
Call updateStageData with partial data after each milestone
```

With:
```
Save required fields via updateStageData BEFORE calling createArtifact. Your plan-spec tracks progress. Required fields are validated at submit time.
```

**Step 3: Commit**

```
feat(harness): align all 14 stage skill Output Contracts with validation gate
```

---

### Task 10: Deploy to Dev + Manual Smoke Test

**Files:**
- Reference: `scripts/deploy-skills-dev.py`

**Step 1: Deploy Convex functions**

Run: `npx convex dev` — verify all functions deploy successfully.

**Step 2: Deploy system prompt + skills to dev DB**

Update `scripts/deploy-skills-dev.py` CHANGE_NOTE:

```python
CHANGE_NOTE = "updated-6: harness plan system — model-driven task tracking, validation gate, plan-spec capture"
```

Run: `python3 scripts/deploy-skills-dev.py`

Expected: All 14 skills + system prompt deploy, dry run passes.

**Step 3: Manual smoke test**

Open app against dev DB. Start new conversation. Verify:
1. Model emits `plan-spec` fence in first response
2. Plan-spec stripped from visible text (user doesn't see YAML)
3. `[PLAN-CAPTURE]` log appears in terminal
4. UnifiedProcessCard shows model's tasks (not hardcoded)
5. SidebarQueueProgress shows model's tasks
6. Choice card still works (no regression)

**Step 4: Commit any fixes from smoke test**

```
fix(harness): [describe fix if needed]
```

---

### Task 11: Final Verification + Commit All

**Step 1: Run full type check**

Run: `npx tsc --noEmit`

**Step 2: Verify no regressions**

- Choice card YAML capture still works
- Edit/resend reset clears _plan
- Validation panel still appears after submit
- Stage transitions still work

**Step 3: Final commit if needed**

```
chore(harness): final verification pass
```
