# Incremental Save Agent Harness — Implementation Plan (v1)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make AI model save stageData fields incrementally (one per turn) via harness-enforced `saveStageDraft` tool, so UnifiedProcessCard shows real-time progress instead of bulk jumps. Scope: gagasan + topik stages only.

**Architecture:** New `saveStageDraft` tool for draft checkpoints (separate from `updateStageData` which stays strict). `buildIncrementalSavePrepareStep()` reads task-derivation definitions, checks which fields are incomplete, and returns a prepareStep config that forces the model to call `saveStageDraft` for the next empty field. Tool is hard-gated via execute-time flag — blocked outside incremental mode. No auto-submit — approval stays user-initiated.

**Tech Stack:** TypeScript, Zod, Vercel AI SDK (prepareStep/stopWhen), Convex, Vitest

---

## Task 1: Create shared helpers for draft save allowlist

**Files:**
- Create: `src/lib/ai/draft-save-fields.ts`
- Test: `src/lib/ai/__tests__/draft-save-fields.test.ts`

### Step 1: Write the failing tests

Create `src/lib/ai/__tests__/draft-save-fields.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import {
  isDraftSaveSupportedStage,
  isAllowedDraftField,
  getDraftSaveAllowedFields,
} from "../draft-save-fields"

describe("isDraftSaveSupportedStage", () => {
  it("returns true for gagasan", () => {
    expect(isDraftSaveSupportedStage("gagasan")).toBe(true)
  })

  it("returns true for topik", () => {
    expect(isDraftSaveSupportedStage("topik")).toBe(true)
  })

  it("returns false for outline (not in v1)", () => {
    expect(isDraftSaveSupportedStage("outline")).toBe(false)
  })

  it("returns false for unknown stage", () => {
    expect(isDraftSaveSupportedStage("nonexistent")).toBe(false)
  })
})

describe("isAllowedDraftField", () => {
  it("allows ideKasar for gagasan", () => {
    expect(isAllowedDraftField("gagasan", "ideKasar")).toBe(true)
  })

  it("allows analisis for gagasan", () => {
    expect(isAllowedDraftField("gagasan", "analisis")).toBe(true)
  })

  it("rejects referensiAwal for gagasan (auto-persist, not draft-save)", () => {
    expect(isAllowedDraftField("gagasan", "referensiAwal")).toBe(false)
  })

  it("rejects ringkasan for gagasan (belongs to updateStageData)", () => {
    expect(isAllowedDraftField("gagasan", "ringkasan")).toBe(false)
  })

  it("allows definitif for topik", () => {
    expect(isAllowedDraftField("topik", "definitif")).toBe(true)
  })

  it("rejects any field for unsupported stage", () => {
    expect(isAllowedDraftField("outline", "sections")).toBe(false)
  })
})

describe("getDraftSaveAllowedFields", () => {
  it("returns 3 fields for gagasan", () => {
    expect(getDraftSaveAllowedFields("gagasan")).toEqual(["ideKasar", "analisis", "angle"])
  })

  it("returns 4 fields for topik", () => {
    expect(getDraftSaveAllowedFields("topik")).toEqual([
      "definitif", "angleSpesifik", "argumentasiKebaruan", "researchGap",
    ])
  })

  it("returns empty for unsupported stage", () => {
    expect(getDraftSaveAllowedFields("outline")).toEqual([])
  })
})
```

### Step 2: Run test to verify it fails

Run: `npx vitest run src/lib/ai/__tests__/draft-save-fields.test.ts`
Expected: FAIL — module not found

### Step 3: Implement the helpers

Create `src/lib/ai/draft-save-fields.ts`:

```typescript
/**
 * Allowlist of fields that saveStageDraft can write, per stage.
 * v1: gagasan + topik only. Excludes auto-persist fields (referensiAwal, referensiPendukung)
 * and mature-save-only fields (ringkasan, ringkasanDetail, novelty).
 */
export const DRAFT_SAVE_ALLOWED_FIELDS: Record<string, readonly string[]> = {
  gagasan: ["ideKasar", "analisis", "angle"],
  topik: ["definitif", "angleSpesifik", "argumentasiKebaruan", "researchGap"],
} as const

export function isDraftSaveSupportedStage(stage: string): boolean {
  return stage in DRAFT_SAVE_ALLOWED_FIELDS
}

export function isAllowedDraftField(stage: string, field: string): boolean {
  const allowed = DRAFT_SAVE_ALLOWED_FIELDS[stage]
  return allowed?.includes(field) ?? false
}

export function getDraftSaveAllowedFields(stage: string): readonly string[] {
  return DRAFT_SAVE_ALLOWED_FIELDS[stage] ?? []
}
```

### Step 4: Run test to verify it passes

Run: `npx vitest run src/lib/ai/__tests__/draft-save-fields.test.ts`
Expected: All PASS

### Step 5: Commit

```bash
git add src/lib/ai/draft-save-fields.ts src/lib/ai/__tests__/draft-save-fields.test.ts
git commit -m "feat: add draft save field allowlist helpers for gagasan/topik"
```

---

## Task 2: Create `saveStageDraft` tool with hard-gate

**Files:**
- Create: `src/lib/ai/paper-tools-draft-save.ts` (warning filter)
- Test: `src/lib/ai/__tests__/save-stage-draft.test.ts`
- Modify: `src/lib/ai/paper-tools.ts` (add tool to `createPaperTools()` return object, add `draftSaveGate` to context)

**Context:** `createPaperTools()` at `paper-tools.ts:35` is a factory that returns a tools object. The returned object includes `startPaperSession`, `updateStageData`, `compileDaftarPustaka`, `submitStageForValidation`, and `inspectSourceDocument`. `saveStageDraft` is added here. `createArtifact` is NOT in this file — it lives in route.ts tool registry (~line 1398).

### Step 1: Write the failing tests for warning filter

Create `src/lib/ai/__tests__/save-stage-draft.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { filterDraftSaveWarnings } from "../paper-tools-draft-save"

describe("filterDraftSaveWarnings", () => {
  it("filters ringkasan-not-provided warning", () => {
    const warning =
      "Ringkasan not provided. This stage CANNOT be approved without ringkasan. " +
      "Call updateStageData again with the 'ringkasan' field containing the agreed key decisions (max 280 characters)."
    expect(filterDraftSaveWarnings(warning)).toBeUndefined()
  })

  it("preserves unknown-keys warning", () => {
    const warning = "Unknown keys stripped: foo, bar. Use keys matching the schema for stage gagasan."
    expect(filterDraftSaveWarnings(warning)).toBe(warning)
  })

  it("preserves URL validation warning", () => {
    const warning = "ANTI-HALLUCINATION: 2 of 3 references in field 'referensiAwal' do NOT have a URL."
    expect(filterDraftSaveWarnings(warning)).toBe(warning)
  })

  it("filters ringkasan warning but keeps others in combined warning", () => {
    const combined =
      "Unknown keys stripped: foo. Use keys matching the schema for stage gagasan. | " +
      "Ringkasan not provided. This stage CANNOT be approved without ringkasan. " +
      "Call updateStageData again with the 'ringkasan' field containing the agreed key decisions (max 280 characters)."
    const result = filterDraftSaveWarnings(combined)
    expect(result).toContain("Unknown keys stripped")
    expect(result).not.toContain("Ringkasan not provided")
  })

  it("returns undefined for undefined input", () => {
    expect(filterDraftSaveWarnings(undefined)).toBeUndefined()
  })
})
```

### Step 2: Run test to verify it fails

Run: `npx vitest run src/lib/ai/__tests__/save-stage-draft.test.ts`
Expected: FAIL — module not found

### Step 3: Create the warning filter helper

Create `src/lib/ai/paper-tools-draft-save.ts`:

```typescript
/**
 * Filters backend warnings for saveStageDraft tool.
 * "Ringkasan not provided." is expected noise for draft saves — filter by exact prefix.
 * All other warnings (unknown keys, URL validation) pass through.
 */
export function filterDraftSaveWarnings(warning: string | undefined): string | undefined {
  if (!warning) return undefined

  const filtered = warning
    .split(" | ")
    .filter((w) => !w.startsWith("Ringkasan not provided."))
    .join(" | ")

  return filtered.length > 0 ? filtered : undefined
}
```

### Step 4: Run test to verify it passes

Run: `npx vitest run src/lib/ai/__tests__/save-stage-draft.test.ts`
Expected: All PASS

### Step 5: Add `draftSaveGate` to `createPaperTools` context and add `saveStageDraft` tool

In `src/lib/ai/paper-tools.ts`:

**5a.** Add `draftSaveGate` to the context parameter type (line ~35):

```typescript
export const createPaperTools = (context: {
    userId: Id<"users">,
    conversationId: Id<"conversations">
    convexToken?: string
    availableSources?: Array<{ url: string; title: string; publishedAt?: number }>
    hasRecentSources?: boolean
    draftSaveGate?: { active: boolean }  // ← ADD
}) => {
```

**5b.** Add imports at top of file:

```typescript
import { isAllowedDraftField, getDraftSaveAllowedFields } from "./draft-save-fields"
import { filterDraftSaveWarnings } from "./paper-tools-draft-save"
```

**5c.** Add `saveStageDraft` tool to the return object, after `submitStageForValidation` (line ~414):

```typescript
saveStageDraft: tool({
    description:
        "Save a single draft field for the current stage. " +
        "System-driven incremental checkpoint — do not call unless instructed by the system.",
    inputSchema: z.object({
        field: z.enum([
            "ideKasar", "analisis", "angle",
            "definitif", "angleSpesifik", "argumentasiKebaruan", "researchGap",
        ]).describe("The field to save. Must be from the current stage's allowed fields."),
        value: z.string().min(1).describe(
            "The field content. Must be non-empty meaningful text based on discussion so far."
        ),
    }),
    execute: async ({ field, value }) => {
        try {
            // Hard-gate: reject if not in incremental save mode
            if (!context.draftSaveGate?.active) {
                return {
                    success: false,
                    error: "saveStageDraft is only available during incremental save mode.",
                }
            }

            const session = await retryQuery(
                () => fetchQuery(api.paperSessions.getByConversation, {
                    conversationId: context.conversationId
                }, convexOptions),
                "paperSessions.getByConversation"
            )
            if (!session) return { success: false, error: "Paper session not found." }

            const currentStage = session.currentStage as string

            if (!isAllowedDraftField(currentStage, field)) {
                const allowed = getDraftSaveAllowedFields(currentStage)
                return {
                    success: false,
                    error: `Field "${field}" is not allowed for draft save in stage "${currentStage}". ` +
                        (allowed.length > 0
                            ? `Allowed: ${allowed.join(", ")}`
                            : `Stage "${currentStage}" does not support draft saves.`),
                }
            }

            const result = await retryMutation(
                () => fetchMutation(api.paperSessions.updateStageData, {
                    sessionId: session._id,
                    stage: currentStage,
                    data: { [field]: value },
                }, convexOptions),
                "paperSessions.updateStageData"
            )

            const filteredWarning = filterDraftSaveWarnings(result.warning)

            return {
                success: true,
                stage: currentStage,
                field,
                ...(filteredWarning ? { warning: filteredWarning } : {}),
            }
        } catch (error) {
            console.error("Error in saveStageDraft tool:", error)
            const errorMessage = error instanceof Error ? error.message : "Failed to save draft field."
            return { success: false, error: errorMessage }
        }
    },
}),
```

### Step 6: Verify type check

Run: `npm run typecheck`
Expected: No type errors

### Step 7: Run all paper-tools tests

Run: `npx vitest run src/lib/ai/`
Expected: All PASS

### Step 8: Commit

```bash
git add src/lib/ai/paper-tools.ts src/lib/ai/paper-tools-draft-save.ts src/lib/ai/__tests__/save-stage-draft.test.ts
git commit -m "feat: add saveStageDraft tool with hard-gate, allowlist, and warning filter"
```

---

## Task 3: Create `buildIncrementalSavePrepareStep()` — core harness logic

**Files:**
- Create: `src/lib/ai/incremental-save-harness.ts`
- Test: `src/lib/ai/__tests__/incremental-save-harness.test.ts`

### Step 1: Write the failing tests

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

    it("returns undefined when stage is not supported (outline)", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "outline",
        stageData: {},
        stageStatus: "drafting",
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

  describe("incremental mode", () => {
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
    })

    it("targets angle when analisis is filled", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: ALMOST_COMPLETE_GAGASAN_DATA,
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result).toBeDefined()
      expect(result!.targetField).toBe("angle")
    })

    it("prepareStep forces saveStageDraft at step 0, none at step 1", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: PARTIAL_GAGASAN_DATA,
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      const step0 = result!.prepareStep({ stepNumber: 0 })
      expect(step0!.toolChoice).toEqual({ type: "tool", toolName: "saveStageDraft" })
      expect(step0!.activeTools).toEqual(["saveStageDraft"])

      const step1 = result!.prepareStep({ stepNumber: 1 })
      expect(step1!.toolChoice).toBe("none")
      expect(step1!.activeTools).toEqual([])
    })
  })

  describe("auto-persist field skipping", () => {
    it("skips referensiAwal even when empty (auto-persisted by server)", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: {},
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result!.targetField).toBe("ideKasar")
    })

    it("skips referensiPendukung for topik", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "topik",
        stageData: {},
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result!.targetField).toBe("definitif")
    })
  })

  describe("system note", () => {
    it("includes field name, INCREMENTAL_SAVE, and saveStageDraft", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: { referensiAwal: [{ title: "t" }] },
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result!.systemNote).toContain("ideKasar")
      expect(result!.systemNote).toContain("INCREMENTAL_SAVE")
      expect(result!.systemNote).toContain("saveStageDraft")
    })
  })

  describe("topik stage support", () => {
    it("targets definitif as first field", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "topik",
        stageData: {},
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result).toBeDefined()
      expect(result!.targetField).toBe("definitif")
    })
  })
})
```

### Step 2: Run tests to verify they fail

Run: `npx vitest run src/lib/ai/__tests__/incremental-save-harness.test.ts`
Expected: FAIL — module not found

### Step 3: Implement `buildIncrementalSavePrepareStep`

Create `src/lib/ai/incremental-save-harness.ts`:

```typescript
import { deriveTaskList } from "@/lib/paper/task-derivation"
import { isDraftSaveSupportedStage } from "./draft-save-fields"

/**
 * Fields auto-persisted server-side (appendSearchReferences).
 * Harness skips these — they don't need model cooperation.
 */
const AUTO_PERSIST_FIELDS: Record<string, string[]> = {
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
}

export function buildIncrementalSavePrepareStep(opts: {
  currentStage: string
  stageData: Record<string, unknown>
  stageStatus: string
  enableWebSearch: boolean
}): IncrementalSaveConfig | undefined {
  if (opts.enableWebSearch) return undefined
  if (opts.stageStatus !== "drafting") return undefined
  if (!isDraftSaveSupportedStage(opts.currentStage)) return undefined

  const stageId = opts.currentStage
  const taskSummary = deriveTaskList(stageId as any, { [stageId]: opts.stageData })
  if (!taskSummary || taskSummary.tasks.length === 0) return undefined

  const skipFields = AUTO_PERSIST_FIELDS[stageId] ?? []

  const pendingTasks = taskSummary.tasks.filter(
    (t) => t.status === "pending" && !skipFields.includes(t.field)
  )

  if (pendingTasks.length === 0) return undefined

  const targetTask = pendingTasks[0]

  return {
    targetField: targetTask.field,
    maxToolSteps: 2,
    systemNote: buildIncrementalNote(targetTask.field, targetTask.label),
    prepareStep: ({ stepNumber }) => {
      if (stepNumber === 0) {
        return {
          toolChoice: { type: "tool", toolName: "saveStageDraft" } as const,
          activeTools: ["saveStageDraft"],
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
INSTRUCTION: Save your "${field}" (${label}) now using saveStageDraft.
Base it on the discussion and references so far.
If discussion hasn't covered this yet, provide your best draft
based on available references.
══════════════════════════════════════════════════════════════`
}
```

### Step 4: Run tests to verify they pass

Run: `npx vitest run src/lib/ai/__tests__/incremental-save-harness.test.ts`
Expected: All PASS

### Step 5: Run full test suite

Run: `npx vitest run src/lib/`
Expected: All PASS, no regressions

### Step 6: Commit

```bash
git add src/lib/ai/incremental-save-harness.ts src/lib/ai/__tests__/incremental-save-harness.test.ts
git commit -m "feat: add buildIncrementalSavePrepareStep targeting saveStageDraft"
```

---

## Task 4: Integrate harness into route.ts

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Context:** route.ts has two streamText calls: primary provider (~line 2437) and fallback provider (~line 2830). Both need identical incremental save integration. Tools are built at ~line 1398 via a global registry object, with `createPaperTools()` spread at ~line 1770.

### Step 1: Add import

At the top of `route.ts`, add:

```typescript
import { buildIncrementalSavePrepareStep } from "@/lib/ai/incremental-save-harness"
```

### Step 2: Create gate and pass to createPaperTools

Before the tools registry is built (~line 1768), add:

```typescript
const draftSaveGate = { active: false }
```

At the `createPaperTools()` call (~line 1770), add `draftSaveGate`:

```typescript
...createPaperTools({
    userId: userId as Id<"users">,
    conversationId: currentConversationId as Id<"conversations">,
    convexToken,
    availableSources: recentSourcesList,
    hasRecentSources: hasRecentSourcesInDb,
    draftSaveGate,  // ← ADD
}),
```

### Step 3: Build incremental save config after existing guards

After `missingArtifactNote` (around line 2207), add:

```typescript
// Incremental save harness: force per-field draft save in function-tools turns
// Only active for supported stages (gagasan/topik in v1)
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

// Activate gate — saveStageDraft execute() will check this
if (incrementalSaveConfig) {
    draftSaveGate.active = true
    console.log(
        `[IncrementalSave] targetField=${incrementalSaveConfig.targetField}, ` +
        `maxToolSteps=${incrementalSaveConfig.maxToolSteps}`
    )
}
```

### Step 4: Inject system note into messages

In the `fullMessagesGateway` construction, `!enableWebSearch` branch (around line 2231), add after `missingArtifactNote` injection:

```typescript
...(incrementalSaveConfig?.systemNote
    ? [{ role: "system" as const, content: incrementalSaveConfig.systemNote }]
    : []),
```

### Step 5: Wire prepareStep priority chain — primary provider

At line ~2444, change:

```typescript
// BEFORE:
prepareStep: (primaryExactSourceRoutePlan.prepareStep ?? deterministicSyncPrepareStep) as any,
stopWhen: stepCountIs(primaryExactSourceRoutePlan.maxToolSteps ?? maxToolSteps),

// AFTER:
prepareStep: (primaryExactSourceRoutePlan.prepareStep ?? deterministicSyncPrepareStep ?? incrementalSaveConfig?.prepareStep) as any,
stopWhen: stepCountIs(primaryExactSourceRoutePlan.maxToolSteps ?? (shouldForceGetCurrentPaperState ? 2 : undefined) ?? incrementalSaveConfig?.maxToolSteps ?? 5),
```

Remove or inline the `maxToolSteps` variable (line ~2247) since its value is now computed inline in `stopWhen`.

### Step 6: Wire prepareStep priority chain — fallback provider

At the fallback streamText (~line 2847), apply same pattern:

```typescript
// BEFORE:
prepareStep: (fallbackExactSourceRoutePlan.prepareStep ?? fallbackDeterministicSyncPrepareStep) as any,
stopWhen: stepCountIs(fallbackExactSourceRoutePlan.maxToolSteps ?? fallbackMaxToolSteps),

// AFTER:
prepareStep: (fallbackExactSourceRoutePlan.prepareStep ?? fallbackDeterministicSyncPrepareStep ?? incrementalSaveConfig?.prepareStep) as any,
stopWhen: stepCountIs(fallbackExactSourceRoutePlan.maxToolSteps ?? (shouldForceGetCurrentPaperState ? 2 : undefined) ?? incrementalSaveConfig?.maxToolSteps ?? 5),
```

Remove or inline `fallbackMaxToolSteps` similarly.

### Step 7: Verify type check

Run: `npm run typecheck`
Expected: No type errors

### Step 8: Commit

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: integrate incremental save harness into route.ts with gate wiring"
```

---

## Task 5: Update prompt instructions

**Files:**
- Modify: `src/lib/ai/paper-mode-prompt.ts:~291-294`

### Step 1: Find and replace the save instruction

Find:
```
- Save progress with updateStageData() after discussion is mature
```

Replace with:
```
- The system will prompt you to save each field incrementally during the workflow. When prompted, provide meaningful content for the requested field based on your discussion with the user so far. Quality matters — give your best analysis, not placeholder text.
```

### Step 2: Verify no lint errors

Run: `npx eslint src/lib/ai/paper-mode-prompt.ts`
Expected: No errors

### Step 3: Commit

```bash
git add src/lib/ai/paper-mode-prompt.ts
git commit -m "feat: update prompt for incremental harness-driven saves"
```

---

## Task 6: End-to-end verification

**Files:** None (verification only)

### Step 1: Run all tests

Run: `npx vitest run`
Expected: All tests pass, no regressions

### Step 2: Run type check (repo contract)

Run: `npm run typecheck`
Expected: No type errors. This runs `typegen + tsc -p tsconfig.typecheck.json` per package.json:17.

### Step 3: Run lint

Run: `npx eslint src/lib/ai/draft-save-fields.ts src/lib/ai/paper-tools-draft-save.ts src/lib/ai/incremental-save-harness.ts src/lib/ai/paper-tools.ts src/app/api/chat/route.ts src/lib/ai/paper-mode-prompt.ts`
Expected: No errors

### Step 4: Manual verification checklist

Verify in dev mode (paper mode, gagasan stage):

1. Start new paper session, send topic
2. After search completes (1/4), respond to model
3. Check console for `[IncrementalSave] targetField=ideKasar` log
4. Verify model calls `saveStageDraft` (not `updateStageData`)
5. Verify UnifiedProcessCard shows 2/4
6. Continue conversation → verify 3/4 next turn (analisis)
7. Continue → verify 4/4 next turn (angle)
8. Verify model can still call `updateStageData` with ringkasan for mature save
9. Verify `submitStageForValidation` only triggers on user intent, not automatically
10. Verify no behavior change for stages outside gagasan/topik (e.g. outline)
11. Verify saveStageDraft returns error if called in non-incremental turn (gate check)

### Step 5: Commit any fixes from verification

```bash
git commit -m "fix: adjustments from e2e verification"
```
