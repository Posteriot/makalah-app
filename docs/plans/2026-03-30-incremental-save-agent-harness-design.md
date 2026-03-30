# Incremental Save Agent Harness Design

> Upgrade paper-mode harness from "model decides when to save" to "harness enforces
> incremental per-field save with per-step context injection."

## Principle

**Harness controls timing, model controls content.** The harness decides *when* and
*which field* to save. The model decides the *content* of that field. A per-turn
system note gives the model context so it generates meaningful output.

## Decisions (from brainstorming)

| Decision | Choice | Why |
|----------|--------|-----|
| Narration style | Mix — natural discussion, harness saves in background | A too noisy, B loses transparency, C natural |
| Save granularity | Strict per-field — one updateStageData per turn | Whole point is incremental visibility |
| Enforcement trigger | Every function-tools turn — check next empty field | Trigger-based reliable, conditional fragile, lazy permissive |
| ringkasan timing | Optional on save, required on submit | Separation: draft save vs finalization |
| Prompt changes | Minimal — remove "save after mature", add "system will prompt" | Prompt-only has ~50% compliance; harness enforces |
| Artifact flow | Final turn chains: updateStageData + createArtifact + submitStageForValidation | No extra turn, approval panel appears immediately |
| Stage scope | Generic from the start — reads task-derivation.ts per stage | Same logic all stages, no hardcoding |

## Architecture

### Flow (gagasan example, generic for all stages)

```
Turn 1 (search): referensiAwal auto-persist → 1/4
Turn 2 (func-tools): harness force ideKasar → 2/4, model free text
Turn 3 (func-tools): harness force analisis → 3/4, model free text
Turn 4 (func-tools): harness force angle+ringkasan → 4/4, createArtifact, submitStageForValidation
```

### prepareStep Priority Chain

```
1. Exact source routing      (highest — safety critical)
2. Sync request              (getCurrentPaperState)
3. Save/submit intent        (user explicitly asks)
4. Incremental save  ← NEW   (harness-driven per-field save)
5. Default undefined          (model decides)
```

## Core Function: `buildIncrementalSavePrepareStep()`

### Signature

```typescript
function buildIncrementalSavePrepareStep(opts: {
  paperSession: PaperSession
  currentStage: PaperStageId
  enableWebSearch: boolean
}): {
  prepareStep: PrepareStepFunction | undefined
  maxToolSteps: number
  systemNote: string
} | undefined
```

### Decision Tree

```
1. Guard: enableWebSearch === true? → return undefined
2. Guard: stageStatus !== "drafting"? → return undefined
3. Get task definitions for currentStage from task-derivation.ts
4. Get current stageData fields
5. Find FIRST incomplete field (skip auto-persist fields)
6. No incomplete field? → return undefined
7. Is this the LAST incomplete field?
   YES → "final turn":
     step 0: force updateStageData (field + ringkasan)
     step 1: force createArtifact
     step 2: force submitStageForValidation
     maxToolSteps: 3
   NO → "incremental":
     step 0: force updateStageData (field only)
     step 1: toolChoice "none" (free text)
     maxToolSteps: 2
```

### Auto-Persist Field Skip

Fields saved server-side without model cooperation are skipped:

```typescript
const AUTO_PERSIST_FIELDS: Record<string, string[]> = {
  gagasan: ["referensiAwal"],
  topik: ["referensiPendukung"],
}
```

For gagasan, harness enforces 3 fields: ideKasar → analisis → angle.

### System Note Injection

Per-turn note injected into messages (same pattern as getFunctionToolsModeNote):

**Incremental mode:**
```
══════════════════════════════════════════════════════════════
MODE: INCREMENTAL_SAVE | Field: ideKasar
INSTRUCTION: Save your "ideKasar" (rough idea exploration) now.
Base it on the discussion and references so far.
If discussion hasn't covered this yet, provide your best draft
based on available referensiAwal.
══════════════════════════════════════════════════════════════
```

**Final turn mode:**
```
══════════════════════════════════════════════════════════════
MODE: FINAL_SAVE_AND_SUBMIT | Field: angle
INSTRUCTION: This is the final field. You MUST:
1. Call updateStageData with "angle" + "ringkasan"
2. Call createArtifact with full paper content
3. Call submitStageForValidation
All three calls in this turn.
══════════════════════════════════════════════════════════════
```

## Changes Per Layer

| Layer | File | Change |
|-------|------|--------|
| Tool schema | `paper-tools.ts` | `ringkasan` → `.optional()` |
| Harness logic | `route.ts` (new function, likely extracted) | `buildIncrementalSavePrepareStep()` |
| Prompt | `paper-mode-prompt.ts` | Remove "save after mature", add "system will prompt incremental save" |
| Submit guard | `paper-tools.ts` (submitStageForValidation) | Reject if ringkasan missing from stageData |
| Task derivation | `task-derivation.ts` | No change — data source for harness |
| Convex backend | `paperSessions.ts` | No change — merge-based already supports partial save |
| UI | No change | UnifiedProcessCard auto-reflects stageData via subscription |

## Integration in route.ts

```typescript
const incrementalSave = (
  !enableWebSearch
  && paperModePrompt
  && !shouldForceGetCurrentPaperState
  && !shouldForceSubmitValidation
)
  ? buildIncrementalSavePrepareStep({ paperSession, currentStage, enableWebSearch })
  : undefined

// prepareStep priority chain:
prepareStep: (
  primaryExactSourceRoutePlan.prepareStep
  ?? deterministicSyncPrepareStep
  ?? incrementalSave?.prepareStep
) as any,

// maxToolSteps:
stopWhen: stepCountIs(
  primaryExactSourceRoutePlan.maxToolSteps
  ?? (shouldForceGetCurrentPaperState ? 2 : undefined)
  ?? incrementalSave?.maxToolSteps
  ?? 5
),

// System note injection into messages (if incrementalSave active)
```

## Edge Cases

| Scenario | Handling |
|----------|----------|
| User hasn't discussed field yet | Model generates best draft from referensi; draft save, user can revise |
| Model generates garbage | No quality gate by design (tools = simple executors); user revises |
| Exact source routing active | Priority chain: exact source wins, incremental skipped this turn |
| User explicitly asks save/submit | shouldForceSubmitValidation wins in priority chain |
| Stage transition mid-flow | Reads currentStage fresh every turn; auto-switches task definitions |
| All fields complete, not submitted | Returns undefined; model free to act or user triggers |

## Terminology

This design implements an **agent harness** pattern — specifically the **loop control**
and **per-step context engineering** aspects. The harness (buildIncrementalSavePrepareStep)
controls tool dispatch timing; the model (via prompt context) controls content quality.

Reference: Anthropic "Effective harnesses for long-running agents" (2025).
