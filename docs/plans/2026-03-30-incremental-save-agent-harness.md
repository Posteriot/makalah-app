# Incremental Save Agent Harness — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make AI model save stageData fields incrementally (one per turn) via harness-enforced prepareStep, so UnifiedProcessCard shows real-time progress instead of bulk jumps.

**Architecture:** `buildIncrementalSavePrepareStep()` reads task-derivation definitions, checks which fields are incomplete, and returns a prepareStep config that forces the model to save the next empty field. Final turn chains updateStageData + createArtifact + submitStageForValidation.

**Tech Stack:** TypeScript, Zod, Vercel AI SDK (prepareStep/stopWhen), Convex, Vitest

---

### Task 1: Make `ringkasan` optional in `updateStageData` schema

**Files:**
- Modify: `src/lib/ai/paper-tools.ts:147-150`

**Step 1: Change the Zod schema**

In `src/lib/ai/paper-tools.ts`, find line 147:

```typescript
ringkasan: z.string().max(280).describe(
    "REQUIRED! The main decision AGREED upon with the user for this stage. Max 280 characters. " +
    "Example: 'Agreed angle: AI impact on Indonesian higher education, gap: no studies on private universities'"
),
```

Replace with:

```typescript
ringkasan: z.string().max(280).optional().describe(
    "Summary of the main decision agreed with user for this stage. Max 280 chars. " +
    "Required before submitStageForValidation, but optional for incremental saves. " +
    "Example: 'Agreed angle: AI impact on Indonesian higher education, gap: no studies on private universities'"
),
```

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors related to `ringkasan`

**Step 3: Commit**

```bash
git add src/lib/ai/paper-tools.ts
git commit -m "feat: make ringkasan optional in updateStageData for incremental saves"
```

---

### Task 2: Add ringkasan guard to `submitStageForValidation`

**Files:**
- Modify: `src/lib/ai/paper-tools.ts:382-414`
- Test: `src/lib/ai/__tests__/paper-tools.submitValidation.test.ts` (create)

**Step 1: Write the failing test**

Create `src/lib/ai/__tests__/paper-tools.submitValidation.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest"

/**
 * These tests verify the ringkasan guard logic that will be added
 * to submitStageForValidation. We test the guard function in isolation
 * since the tool's execute() depends on Convex network calls.
 */

// Extract the guard logic into a testable function
import { validateStageReadyForSubmit } from "../paper-tools-validation"

describe("validateStageReadyForSubmit", () => {
  it("returns error when ringkasan is missing", () => {
    const stageData = { ideKasar: "some idea", analisis: "ok" }
    const result = validateStageReadyForSubmit(stageData)
    expect(result.ready).toBe(false)
    expect(result.error).toContain("ringkasan")
  })

  it("returns error when ringkasan is empty string", () => {
    const stageData = { ringkasan: "", ideKasar: "some idea" }
    const result = validateStageReadyForSubmit(stageData)
    expect(result.ready).toBe(false)
    expect(result.error).toContain("ringkasan")
  })

  it("returns ready when ringkasan exists", () => {
    const stageData = { ringkasan: "Valid summary of decisions" }
    const result = validateStageReadyForSubmit(stageData)
    expect(result.ready).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ai/__tests__/paper-tools.submitValidation.test.ts`
Expected: FAIL — module `paper-tools-validation` not found

**Step 3: Create the validation helper**

Create `src/lib/ai/paper-tools-validation.ts`:

```typescript
/**
 * Validates whether a stage's stageData is ready for submission.
 * Extracted for testability — used by submitStageForValidation tool.
 */
export function validateStageReadyForSubmit(
  stageData: Record<string, unknown> | undefined
): { ready: true } | { ready: false; error: string } {
  const ringkasan = stageData?.ringkasan
  if (!ringkasan || (typeof ringkasan === "string" && ringkasan.trim().length === 0)) {
    return {
      ready: false,
      error: "Cannot submit: ringkasan is required. Call updateStageData with ringkasan first.",
    }
  }
  return { ready: true }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ai/__tests__/paper-tools.submitValidation.test.ts`
Expected: PASS

**Step 5: Wire guard into submitStageForValidation tool**

In `src/lib/ai/paper-tools.ts`, inside `submitStageForValidation.execute()`, add before the mutation call (after session fetch, around line 393):

```typescript
import { validateStageReadyForSubmit } from "./paper-tools-validation"

// Inside execute(), after session fetch:
if (!session) return { success: false, error: "Paper session not found." };

// NEW: Check ringkasan before submitting
const currentStageKey = session.currentStage as string
const currentStageData = (session.stageData as Record<string, Record<string, unknown>>)?.[currentStageKey]
const readyCheck = validateStageReadyForSubmit(currentStageData)
if (!readyCheck.ready) {
  return { success: false, error: readyCheck.error }
}
```

**Step 6: Run all paper-tools tests**

Run: `npx vitest run src/lib/ai/`
Expected: All PASS

**Step 7: Commit**

```bash
git add src/lib/ai/paper-tools-validation.ts src/lib/ai/__tests__/paper-tools.submitValidation.test.ts src/lib/ai/paper-tools.ts
git commit -m "feat: add ringkasan guard to submitStageForValidation"
```

---

### Task 3: Create `buildIncrementalSavePrepareStep()` — core harness logic

**Files:**
- Create: `src/lib/ai/incremental-save-harness.ts`
- Test: `src/lib/ai/__tests__/incremental-save-harness.test.ts` (create)
- Read: `src/lib/paper/task-derivation.ts` (data source)

**Step 1: Write the failing tests**

Create `src/lib/ai/__tests__/incremental-save-harness.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { buildIncrementalSavePrepareStep } from "../incremental-save-harness"

const EMPTY_GAGASAN_DATA = {}
const PARTIAL_GAGASAN_DATA = {
  referensiAwal: [{ title: "test", url: "http://test.com" }],
  ideKasar: "Some rough idea",
}
const ALMOST_COMPLETE_GAGASAN_DATA = {
  referensiAwal: [{ title: "test", url: "http://test.com" }],
  ideKasar: "Some rough idea",
  analisis: "Feasibility looks good",
}
const COMPLETE_GAGASAN_DATA = {
  referensiAwal: [{ title: "test", url: "http://test.com" }],
  ideKasar: "Some rough idea",
  analisis: "Feasibility looks good",
  angle: "Specific angle chosen",
}

describe("buildIncrementalSavePrepareStep", () => {
  describe("guards", () => {
    it("returns undefined when enableWebSearch is true", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: EMPTY_GAGASAN_DATA,
        stageStatus: "drafting",
        enableWebSearch: true,
      })
      expect(result).toBeUndefined()
    })

    it("returns undefined when stageStatus is not drafting", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: EMPTY_GAGASAN_DATA,
        stageStatus: "pending_validation",
        enableWebSearch: false,
      })
      expect(result).toBeUndefined()
    })

    it("returns undefined when all fields are complete", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: COMPLETE_GAGASAN_DATA,
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result).toBeUndefined()
    })
  })

  describe("incremental mode (non-final field)", () => {
    it("targets ideKasar when only referensiAwal is filled", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: {
          referensiAwal: [{ title: "ref", url: "http://ref.com" }],
        },
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result).toBeDefined()
      expect(result!.targetField).toBe("ideKasar")
      expect(result!.mode).toBe("incremental")
      expect(result!.maxToolSteps).toBe(2)
    })

    it("targets analisis when ideKasar is filled", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: PARTIAL_GAGASAN_DATA,
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result).toBeDefined()
      expect(result!.targetField).toBe("analisis")
      expect(result!.mode).toBe("incremental")
    })

    it("prepareStep forces updateStageData at step 0, none at step 1", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: PARTIAL_GAGASAN_DATA,
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      const step0 = result!.prepareStep({ stepNumber: 0 })
      expect(step0!.toolChoice).toEqual({ type: "tool", toolName: "updateStageData" })

      const step1 = result!.prepareStep({ stepNumber: 1 })
      expect(step1!.toolChoice).toBe("none")
    })
  })

  describe("final turn mode (last field)", () => {
    it("targets angle as final field with mode final", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: ALMOST_COMPLETE_GAGASAN_DATA,
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result).toBeDefined()
      expect(result!.targetField).toBe("angle")
      expect(result!.mode).toBe("final")
      expect(result!.maxToolSteps).toBe(3)
    })

    it("prepareStep chains: updateStageData → createArtifact → submitStageForValidation", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: ALMOST_COMPLETE_GAGASAN_DATA,
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      const step0 = result!.prepareStep({ stepNumber: 0 })
      expect(step0!.toolChoice).toEqual({ type: "tool", toolName: "updateStageData" })

      const step1 = result!.prepareStep({ stepNumber: 1 })
      expect(step1!.toolChoice).toEqual({ type: "tool", toolName: "createArtifact" })

      const step2 = result!.prepareStep({ stepNumber: 2 })
      expect(step2!.toolChoice).toEqual({ type: "tool", toolName: "submitStageForValidation" })
    })
  })

  describe("auto-persist field skipping", () => {
    it("skips referensiAwal even when empty (auto-persisted)", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: {},
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      // Should target ideKasar, NOT referensiAwal
      expect(result!.targetField).toBe("ideKasar")
    })
  })

  describe("system note", () => {
    it("includes field name in incremental note", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: { referensiAwal: [{ title: "t" }] },
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result!.systemNote).toContain("ideKasar")
      expect(result!.systemNote).toContain("INCREMENTAL_SAVE")
    })

    it("includes FINAL_SAVE_AND_SUBMIT in final note", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: ALMOST_COMPLETE_GAGASAN_DATA,
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result!.systemNote).toContain("FINAL_SAVE_AND_SUBMIT")
      expect(result!.systemNote).toContain("ringkasan")
      expect(result!.systemNote).toContain("createArtifact")
    })
  })

  describe("generic stage support", () => {
    it("works for topik stage", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "topik",
        stageData: {},
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result).toBeDefined()
      // topik first non-auto-persist field is definitif
      expect(result!.targetField).toBe("definitif")
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/ai/__tests__/incremental-save-harness.test.ts`
Expected: FAIL — module not found

**Step 3: Implement `buildIncrementalSavePrepareStep`**

Create `src/lib/ai/incremental-save-harness.ts`:

```typescript
import { deriveTaskList } from "@/lib/paper/task-derivation"
import type { PaperStageId } from "../../convex/paperSessions/constants"

/**
 * Fields auto-persisted server-side (appendSearchReferences).
 * Harness skips these — they don't need model cooperation.
 */
const AUTO_PERSIST_FIELDS: Partial<Record<PaperStageId, string[]>> = {
  gagasan: ["referensiAwal"],
  topik: ["referensiPendukung"],
}

type PrepareStepResult = {
  toolChoice: { type: "tool"; toolName: string } | "none"
  activeTools: string[]
} | undefined

export type IncrementalSaveConfig = {
  prepareStep: (opts: { stepNumber: number }) => PrepareStepResult
  maxToolSteps: number
  systemNote: string
  targetField: string
  mode: "incremental" | "final"
}

export function buildIncrementalSavePrepareStep(opts: {
  currentStage: string
  stageData: Record<string, unknown>
  stageStatus: string
  enableWebSearch: boolean
}): IncrementalSaveConfig | undefined {
  // Guard: only in function-tools turns
  if (opts.enableWebSearch) return undefined

  // Guard: only when drafting
  if (opts.stageStatus !== "drafting") return undefined

  // Get task list for current stage
  const stageId = opts.currentStage as PaperStageId
  const taskSummary = deriveTaskList(stageId, { [stageId]: opts.stageData })
  if (!taskSummary || taskSummary.tasks.length === 0) return undefined

  // Get auto-persist fields to skip
  const skipFields = AUTO_PERSIST_FIELDS[stageId] ?? []

  // Find first incomplete field that isn't auto-persisted
  const pendingTasks = taskSummary.tasks.filter(
    (t) => t.status === "pending" && !skipFields.includes(t.field)
  )

  if (pendingTasks.length === 0) return undefined

  const targetTask = pendingTasks[0]
  const isFinal = pendingTasks.length === 1

  if (isFinal) {
    return {
      targetField: targetTask.field,
      mode: "final",
      maxToolSteps: 3,
      systemNote: buildFinalTurnNote(targetTask.field, targetTask.label),
      prepareStep: ({ stepNumber }) => {
        if (stepNumber === 0) {
          return {
            toolChoice: { type: "tool", toolName: "updateStageData" } as const,
            activeTools: ["updateStageData"],
          }
        }
        if (stepNumber === 1) {
          return {
            toolChoice: { type: "tool", toolName: "createArtifact" } as const,
            activeTools: ["createArtifact"],
          }
        }
        if (stepNumber === 2) {
          return {
            toolChoice: { type: "tool", toolName: "submitStageForValidation" } as const,
            activeTools: ["submitStageForValidation"],
          }
        }
        return undefined
      },
    }
  }

  return {
    targetField: targetTask.field,
    mode: "incremental",
    maxToolSteps: 2,
    systemNote: buildIncrementalNote(targetTask.field, targetTask.label),
    prepareStep: ({ stepNumber }) => {
      if (stepNumber === 0) {
        return {
          toolChoice: { type: "tool", toolName: "updateStageData" } as const,
          activeTools: ["updateStageData"],
        }
      }
      if (stepNumber === 1) {
        return {
          toolChoice: "none" as const,
          activeTools: [],
        }
      }
      return undefined
    },
  }
}

function buildIncrementalNote(field: string, label: string): string {
  return `
══════════════════════════════════════════════════════════════
MODE: INCREMENTAL_SAVE | Field: ${field}
INSTRUCTION: Save your "${field}" (${label}) now.
Base it on the discussion and references so far.
If discussion hasn't covered this yet, provide your best draft
based on available references.
Do NOT include ringkasan — it is only needed in the final save.
══════════════════════════════════════════════════════════════`
}

function buildFinalTurnNote(field: string, label: string): string {
  return `
══════════════════════════════════════════════════════════════
MODE: FINAL_SAVE_AND_SUBMIT | Field: ${field}
INSTRUCTION: This is the final field. You MUST complete these 3 calls in order:
1. Call updateStageData with "${field}" (${label}) + "ringkasan" (summary of agreed decision, max 280 chars)
2. Call createArtifact with full paper content for this stage
3. Call submitStageForValidation to trigger user approval
All three calls happen in this turn. Do not skip any.
══════════════════════════════════════════════════════════════`
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/ai/__tests__/incremental-save-harness.test.ts`
Expected: All PASS

**Step 5: Run full test suite**

Run: `npx vitest run src/lib/`
Expected: All PASS, no regressions

**Step 6: Commit**

```bash
git add src/lib/ai/incremental-save-harness.ts src/lib/ai/__tests__/incremental-save-harness.test.ts
git commit -m "feat: add buildIncrementalSavePrepareStep harness logic with tests"
```

---

### Task 4: Integrate harness into route.ts

**Files:**
- Modify: `src/app/api/chat/route.ts:2186-2200` (guard conditions)
- Modify: `src/app/api/chat/route.ts:2221-2240` (message injection)
- Modify: `src/app/api/chat/route.ts:2437-2445` (prepareStep/stopWhen)

**Step 1: Add import**

At the top of `route.ts`, add:

```typescript
import { buildIncrementalSavePrepareStep } from "@/lib/ai/incremental-save-harness"
```

**Step 2: Build incremental save config after existing guards**

After `shouldForceSubmitValidation` and `missingArtifactNote` (around line 2207), add:

```typescript
// Incremental save harness: force per-field save in function-tools turns
const incrementalSaveConfig = (
    !enableWebSearch
    && !!paperModePrompt
    && !shouldForceGetCurrentPaperState
    && !shouldForceSubmitValidation
    && paperSession
)
    ? buildIncrementalSavePrepareStep({
        currentStage: paperSession.currentStage as string,
        stageData: ((paperSession.stageData as Record<string, Record<string, unknown>>)?.[paperSession.currentStage as string]) ?? {},
        stageStatus: paperSession.stageStatus as string,
        enableWebSearch,
    })
    : undefined
```

**Step 3: Inject system note into messages**

In the `fullMessagesGateway` construction (non-search branch, around line 2231), add the incremental save note injection:

```typescript
// In the !enableWebSearch branch, after missingArtifactNote injection:
...(incrementalSaveConfig?.systemNote
    ? [{ role: "system" as const, content: incrementalSaveConfig.systemNote }]
    : []),
```

**Step 4: Wire prepareStep priority chain**

At line ~2444, change:

```typescript
// BEFORE:
prepareStep: (primaryExactSourceRoutePlan.prepareStep ?? deterministicSyncPrepareStep) as any,
stopWhen: stepCountIs(primaryExactSourceRoutePlan.maxToolSteps ?? maxToolSteps),

// AFTER:
prepareStep: (primaryExactSourceRoutePlan.prepareStep ?? deterministicSyncPrepareStep ?? incrementalSaveConfig?.prepareStep) as any,
stopWhen: stepCountIs(primaryExactSourceRoutePlan.maxToolSteps ?? (shouldForceGetCurrentPaperState ? 2 : undefined) ?? incrementalSaveConfig?.maxToolSteps ?? 5),
```

Note: `maxToolSteps` variable is currently `shouldForceGetCurrentPaperState ? 2 : 5`. We need to break this apart so incremental save's maxToolSteps (2 or 3) can slot in. Replace the original `maxToolSteps` variable (line 2247) with:

```typescript
// Remove the old maxToolSteps variable and inline into stopWhen above
```

**Step 5: Apply same changes to fallback provider block**

The fallback provider (around line 2793-2860) has a duplicate prepareStep/stopWhen. Apply the same pattern:

```typescript
// Fallback block — same incremental save integration
prepareStep: (fallbackExactSourceRoutePlan.prepareStep ?? fallbackDeterministicSyncPrepareStep ?? incrementalSaveConfig?.prepareStep) as any,
stopWhen: stepCountIs(fallbackExactSourceRoutePlan.maxToolSteps ?? (shouldForceGetCurrentPaperState ? 2 : undefined) ?? incrementalSaveConfig?.maxToolSteps ?? 5),
```

**Step 6: Add telemetry log**

After the `incrementalSaveConfig` construction, add:

```typescript
if (incrementalSaveConfig) {
    console.log(
        `[IncrementalSave] mode=${incrementalSaveConfig.mode}, ` +
        `targetField=${incrementalSaveConfig.targetField}, ` +
        `maxToolSteps=${incrementalSaveConfig.maxToolSteps}`
    )
}
```

**Step 7: Verify type check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No type errors

**Step 8: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: integrate incremental save harness into route.ts priority chain"
```

---

### Task 5: Update prompt instructions

**Files:**
- Modify: `src/lib/ai/paper-mode-prompt.ts:~291-294`

**Step 1: Find and replace the save instruction**

Find:
```
- Save progress with updateStageData() after discussion is mature
```

Replace with:
```
- The system will prompt you to save each field incrementally during the workflow. When prompted, provide meaningful content for the requested field based on your discussion with the user so far. Quality matters — give your best analysis, not placeholder text.
```

**Step 2: Verify no lint errors**

Run: `npx eslint src/lib/ai/paper-mode-prompt.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/ai/paper-mode-prompt.ts
git commit -m "feat: update prompt for incremental harness-driven saves"
```

---

### Task 6: End-to-end verification

**Files:** None (verification only)

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass, no regressions

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Run lint**

Run: `npx eslint src/lib/ai/incremental-save-harness.ts src/lib/ai/paper-tools-validation.ts src/lib/ai/paper-tools.ts src/app/api/chat/route.ts src/lib/ai/paper-mode-prompt.ts`
Expected: No errors

**Step 4: Manual verification checklist**

Verify in dev mode (paper mode, gagasan stage):
1. Start new paper session → send topic
2. After search completes (1/4), respond to model
3. Verify model is forced to call updateStageData (check console for `[IncrementalSave]` log)
4. Verify UnifiedProcessCard shows 2/4 after model responds
5. Continue conversation → verify 3/4 appears next turn
6. Continue → verify 4/4 + artifact + approval panel appears in final turn
7. Verify ringkasan is present in the final updateStageData call

**Step 5: Commit any fixes from verification**

```bash
git commit -m "fix: adjustments from e2e verification"
```
