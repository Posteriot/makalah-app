# Plan: Force updateStageData After Search via prepareStep

> Enforce that the model MUST call `updateStageData` in the turn after web search
> completes, using code-level `prepareStep` enforcement — not prompt instructions.

---

## Problem

After web search, the model enters a tools-available turn but:
1. Doesn't call `updateStageData` — just discusses or generates text
2. Plan card stays at 0/4 tasks because stageData is empty
3. Prompt instructions ("SAVE PROGRESS INCREMENTALLY", "MANDATORY — SAVE PROGRESS NOW")
   are ignored by the model ~50% of the time

## Solution

Use the existing `prepareStep` pattern (proven in `deterministicSyncPrepareStep` and
`buildDeterministicExactSourcePrepareStep`) to **force** `updateStageData` as the first
tool call when conditions are met.

## Existing Pattern (proven, line 2147-2165 in route.ts)

```typescript
// deterministicSyncPrepareStep: forces getCurrentPaperState at step 0
const deterministicSyncPrepareStep = shouldForceGetCurrentPaperState
    ? ({ stepNumber }) => {
        if (stepNumber === 0) {
            return {
                toolChoice: { type: "tool", toolName: "getCurrentPaperState" },
                activeTools: ["getCurrentPaperState"],
            }
        }
        if (stepNumber === 1) {
            return { toolChoice: "none", activeTools: [] }
        }
        return undefined
    }
    : undefined
```

## New Pattern: Force updateStageData After Search

### Trigger conditions

```typescript
// Check if current stage already has ringkasan (= already saved at least once)
const currentStageData = paperSession?.stageData?.[paperSession?.currentStage ?? ""] as
    Record<string, unknown> | undefined
const stageAlreadySaved = typeof currentStageData?.ringkasan === "string"
    && currentStageData.ringkasan.trim().length > 0

const shouldForceUpdateStageData =
    !enableWebSearch                    // This is a tools-available turn (not search turn)
    && !!paperModePrompt               // In paper mode
    && searchAlreadyDone               // Search was done in a previous turn
    && !stageAlreadySaved              // Stage has NOT been saved yet (prevents repeat forcing)
    && !shouldForceGetCurrentPaperState // Not a sync request
    && !shouldForceSubmitValidation     // Not a submit request
    && !isSaveSubmitIntent              // Not saving/submitting
    && paperSession?.stageStatus === "drafting"  // Stage is in drafting mode
```

**Why `searchAlreadyDone`?** This is `true` when previous messages contain search
results (detected by `hasPreviousSearchResults()`). It means the model has search
data in context and should save findings.

**Why `!stageAlreadySaved`?** CRITICAL: `searchAlreadyDone` stays `true` permanently
after search (via stageData evidence path in `hasPreviousSearchResults`). Without
this guard, the force would trigger on EVERY subsequent turn — not just once.
`ringkasan` is the marker: if it exists, the model already saved at least once,
so no need to force again.

**Why `!isSyncRequest` removed?** It's redundant with `!shouldForceGetCurrentPaperState`
since `shouldForceGetCurrentPaperState` already requires `isSyncRequest` to be true.

### prepareStep implementation

```typescript
const forceUpdateStagePrepareStep = shouldForceUpdateStageData
    ? ({ stepNumber }: { stepNumber: number }) => {
        if (stepNumber === 0) {
            return {
                toolChoice: { type: "tool", toolName: "updateStageData" } as const,
                activeTools: ["updateStageData"] as string[],
            }
        }
        // After save, allow all tools (createArtifact, etc.) with auto choice
        return undefined
    }
    : undefined
```

**Key differences from sync pattern:**
- Step 0: Force `updateStageData` (not getCurrentPaperState)
- Step 1+: Return `undefined` (don't block tools — model may want to call createArtifact next)
- maxToolSteps stays at 5 (not reduced to 2)

### Integration into streamText call

```typescript
// Priority chain for prepareStep (highest priority first):
const effectivePrepareStep =
    primaryExactSourceRoutePlan.prepareStep    // Exact source routing (highest)
    ?? deterministicSyncPrepareStep            // Sync request
    ?? forceUpdateStagePrepareStep             // Force save after search (NEW)

const result = streamText({
    model,
    messages: primaryExactSourceRoutePlan.messages,
    tools,
    toolChoice: forcedToolChoice,  // May be set by shouldForceSubmitValidation
    prepareStep: effectivePrepareStep as any,
    stopWhen: stepCountIs(primaryExactSourceRoutePlan.maxToolSteps ?? maxToolSteps),
    ...samplingOptions,
    onFinish: async ({ text, usage }) => { ... },
})
```

## File Changes

### 1. `src/app/api/chat/route.ts`

**Location:** After `shouldForceSubmitValidation` block (~line 2094), before
`shouldApplyDeterministicExactSourceRouting` (~line 2166).

**Add:**
- `shouldForceUpdateStageData` condition (~5 lines)
- `forceUpdateStagePrepareStep` function (~12 lines)

**Modify:**
- Line ~2342: Change `prepareStep` priority chain to include new step

**Total:** ~20 lines added, 1 line modified.

### 2. ALSO in `src/app/api/chat/route.ts` — Fallback streamText path

The fallback `streamText` call (~line 2734) mirrors the primary path. It has its own
`fallbackDeterministicSyncPrepareStep`. The `forceUpdateStagePrepareStep` must ALSO
be added to the fallback prepareStep priority chain (~line 2741):

```typescript
prepareStep: (fallbackExactSourceRoutePlan.prepareStep
    ?? fallbackDeterministicSyncPrepareStep
    ?? forceUpdateStagePrepareStep) as any,  // Same variable, shared
```

`forceUpdateStagePrepareStep` is computed once and shared between primary and fallback.

### 3. NO other files changed

- `paper-tools.ts` — unchanged (updateStageData already auto-fetches stage)
- `task-derivation.ts` — unchanged (reads from stageData which will now be populated)
- `MessageBubble.tsx` — unchanged (TaskProgress reads from usePaperSession which auto-updates)
- `orchestrator.ts` — unchanged (search flow untouched)

## What This Achieves

```
BEFORE (prompt-based, unreliable):
Turn 1 (search): Search runs → model outputs 312 chars placeholder → tasks=0/4
Turn 2 (tools):  Model SHOULD call updateStageData → but ignores instruction → tasks=0/4
Turn 3+:         Eventually bulk-saves → tasks jump 0/4 → 4/4

AFTER (code-enforced):
Turn 1 (search): Search runs → model outputs synthesis → tasks=1/4 (referensiAwal auto-persist)
Turn 2 (tools):  prepareStep FORCES updateStageData at step 0 → tasks=3/4 or 4/4
Turn 3+:         Normal flow with data already saved
```

## Edge Cases

| Case | Behavior |
|------|----------|
| Search didn't happen yet | `searchAlreadyDone = false` → no force, normal flow |
| Already saved (ringkasan exists) | `stageAlreadySaved = true` → no force, prevents repeat forcing |
| Already in submit mode | `shouldForceSubmitValidation` takes priority → no conflict |
| Already in sync mode | `shouldForceGetCurrentPaperState` takes priority → no conflict |
| Stage is pending_validation | `stageStatus !== "drafting"` → no force |
| Exact source routing active | `primaryExactSourceRoutePlan.prepareStep` takes priority → no conflict |
| Primary fails, fallback triggers | Fallback path also has `forceUpdateStagePrepareStep` in chain |
| Model generates poor ringkasan | Conscious trade-off: cold-call ringkasan may be generic, but model has full conversation + search results in context. Can be overwritten by user-initiated updateStageData in subsequent turns. Better than 0/4 indefinitely. |

## Verification

1. Terminal log: Look for `updateStageData` tool call in the turn AFTER search
2. `[PlanContext]` log: Should show tasks > 0 after the forced save turn
3. Plan card UI: Should update from 0/4 → N/4 after the save turn
4. No regressions: sync, submit, exact source routing all still work
