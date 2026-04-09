# Report 12: Force-Inspect Execution Guarantee Fix

Date: 2026-04-09
Session: 2
Triggered by: Codex review — runtime retest showing inspectSourceDocument still not executing during pending_validation

---

## What report 11 fixed

- Force-inspect discipline note injected during pending_validation (via `.messages` from `buildDeterministicExactSourcePrepareStep`)
- Strict metadata output rule added to force-inspect note and EXACT_SOURCE_INSPECTION_RULES
- Absolute no-domain-in-metadata-answers wording

## Why report 11 was still insufficient

The note was injected but the `prepareStep` that forces `toolChoice: { type: "tool", toolName: "inspectSourceDocument" }` was NOT applied. The model received the discipline instruction but was never forced to actually call the tool. Without forced tool execution:

1. `inspectSourceDocument` was never called — no START/END logs
2. Model answered from prior context/source inventory — not from tool result
3. siteName formatting remained contaminated — model saw URLs in source inventory and used them

## Root cause of missing tool execution during `pending_validation`

Two independent blocks prevented tool execution:

### Block 1: `shouldApplyDeterministicExactSourceRouting` excluded `pending_validation`

```typescript
// route.ts:2826-2832 (BEFORE fix)
const shouldApplyDeterministicExactSourceRouting =
    !enableWebSearch &&
    !shouldForceGetCurrentPaperState &&
    !shouldForceSubmitValidation &&
    paperSession?.stageStatus !== "pending_validation" &&  // ← blocked
    paperSession?.stageStatus !== "revision" &&            // ← blocked
    availableExactSources.length > 0
```

When this was false, `buildDeterministicExactSourcePrepareStep` was not called. The prepareStep (which forces `inspectSourceDocument` at step 0) was set to `undefined`.

### Block 2: `revisionChainEnforcer` always took priority via `??` operator

```typescript
// route.ts:3013 (BEFORE fix)
prepareStep: (revisionChainEnforcer ?? primaryExactSourceRoutePlan.prepareStep ?? ...) as any,
```

Even if the force-inspect prepareStep were present, `revisionChainEnforcer` is a defined function during `pending_validation` (non-null). The `??` operator checks nullity of the value, not its return — so revisionChainEnforcer always wins.

During `pending_validation`, revisionChainEnforcer returns `undefined` at step 0 (model is free). This means no tool is forced. The AI SDK treats `undefined` from prepareStep as "no constraint."

### Why the conflict was not real

The revisionChainEnforcer during `pending_validation`:
- Step 0: `return undefined` (model decides freely)
- Steps 1+: only activates if model starts a revision chain (calls `requestRevision`)

The force-inspect prepareStep:
- Step 0: force `inspectSourceDocument`
- Step 1: force `"none"` (text generation)
- maxToolSteps: 2 (stops after 2 steps)

These are compatible because:
1. Force-inspect takes step 0 (inspectSourceDocument) — revisionChainEnforcer would have returned undefined anyway
2. Force-inspect takes step 1 (text generation) — model stops
3. The model never reaches revision chain steps because maxToolSteps = 2
4. The classifier only resolves force-inspect for exact-source metadata requests, not revision requests — they are mutually exclusive by intent

## Exact code fix

### Change 1: Allow force-inspect during `pending_validation`/`revision`

`route.ts` — both primary and fallback paths:

```typescript
// AFTER fix
const shouldApplyDeterministicExactSourceRouting =
    !enableWebSearch &&
    !shouldForceGetCurrentPaperState &&
    !shouldForceSubmitValidation &&
    (exactSourceResolution.mode === "force-inspect" || (
        paperSession?.stageStatus !== "pending_validation" &&
        paperSession?.stageStatus !== "revision"
    )) &&
    availableExactSources.length > 0
```

When `exactSourceResolution.mode === "force-inspect"`, the pending_validation/revision exclusion is bypassed. The full `buildDeterministicExactSourcePrepareStep` runs, producing both the discipline note AND the prepareStep + maxToolSteps.

### Change 2: Compose prepareStep — force-inspect takes priority

`route.ts` — both primary and fallback paths:

```typescript
// AFTER fix
prepareStep: ((() => {
    const forceInspect = primaryExactSourceRoutePlan.prepareStep
    if (forceInspect && revisionChainEnforcer) {
        return (params) => forceInspect(params) ?? revisionChainEnforcer(params)
    }
    return revisionChainEnforcer ?? forceInspect ?? deterministicSyncPrepareStep
})()) as any,
```

When both exist, force-inspect is checked first. If it returns a value (steps 0-1), that value is used. If it returns undefined (steps 2+), revisionChainEnforcer is consulted. Since maxToolSteps = 2, steps 2+ never happen.

### Change 3: Cleaned up report-11 fallback

The report-11 code that only injected `.messages` when force-inspect was resolved but routing was skipped — this is now unnecessary. The routing guard itself allows force-inspect during pending_validation, so the full prepareStep path is used. The fallback branch returns plain `fullMessagesGateway` without special force-inspect handling.

## How revisionChainEnforcer conflict was resolved

Not by removing revisionChainEnforcer — by **composing** the two prepareSteps.

Execution order per step:

| Step | force-inspect returns | revisionChainEnforcer returns | Composed result |
|------|----------------------|------------------------------|-----------------|
| 0 | `{ toolChoice: { type: "tool", toolName: "inspectSourceDocument" } }` | `undefined` (pending_validation) | **inspectSourceDocument forced** |
| 1 | `{ toolChoice: "none" }` | `undefined` | **text generation** |
| 2+ | never reached (maxToolSteps = 2) | N/A | N/A |

The revision chain only activates when the model calls `requestRevision` → `updateArtifact` → `submitStageForValidation`. Since the model is forced to call `inspectSourceDocument` at step 0 and generate text at step 1, it never enters the revision chain.

## Files changed

| File | Change |
|------|--------|
| `src/app/api/chat/route.ts` (primary path) | 1. `shouldApplyDeterministicExactSourceRouting` allows force-inspect during pending_validation. 2. Composed prepareStep: force-inspect first, revisionChainEnforcer fallback. 3. Removed report-11 note-only injection (superseded). |
| `src/app/api/chat/route.ts` (fallback path) | Same three changes mirrored for fallback model. |

No instruction-layer changes in this report. The strict metadata output rules from report 11 remain as defense-in-depth.

## Verification evidence

- TypeScript: `npx tsc --noEmit` — clean
- Tests: 28/28 pass
- Runtime NOT yet retested — user must rerun the OJS article metadata test and verify:
  - `[EXACT-SOURCE] inspectSourceDocument START` appears in terminal log
  - `[EXACT-SOURCE] inspectSourceDocument END` appears in terminal log
  - siteName field shows unavailable without domain commentary
  - author/date come from tool result, not prior context

## Residual limitations

1. **Instruction-layer rules remain as defense-in-depth.** The tool execution is now deterministic (forced by prepareStep), but the model's text response after the tool result is still governed by instruction. The strict metadata output rules from report 11 serve as a second layer if the model attempts to supplement tool results with URL-derived information.

2. **Force-inspect maxToolSteps = 2 limits the model to tool + text.** During pending_validation, the model cannot call additional tools (like `updateArtifact`) in the same turn after answering an exact metadata question. This is correct behavior — a metadata answer should not trigger a revision.

3. **Classifier must correctly distinguish metadata requests from revision requests.** If the classifier incorrectly resolves a revision request as force-inspect, the model would be forced to call inspectSourceDocument instead of revising. This risk is mitigated by the classifier's design which separates `exact_detail` intent from other intents.
