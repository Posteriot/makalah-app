# Implementation Plan: Harness Bug Fixes (post-audit)

Source: `analytic-result.md` (audited 2026-04-15)

## Fix Order

```
Bug 1 (P0 blocker) → verify Bug 4 assumption dari logs → Bug 3 + Bug 2 (parallel)
```

---

## Phase 1: Bug 1 — Empty updateStageData Guard

**Priority**: P0 Blocker
**File**: `src/lib/ai/paper-tools.ts`
**Location**: execute handler, line 139

### What

Reject updateStageData calls where data has zero meaningful keys.
Currently no guard — empty {} goes straight to retryMutation → Convex write → OCC cascade when concurrent.

### Where exactly

Insert early return AFTER the sawSubmitValidationSuccess guard (line 144-152) and BEFORE keyword normalization (line 156):

```
paper-tools.ts:152 (after existing early return)
↓ INSERT HERE
paper-tools.ts:154 (keyword normalization)
```

### Implementation

```typescript
// Guard: reject empty data — enforcer sometimes forces updateStageData
// before model provides content, causing empty writes + OCC cascade.
const dataKeys = Object.keys(data).filter(k => data[k] !== undefined && data[k] !== null)
if (dataKeys.length === 0) {
    console.warn("[updateStageData] Rejected: empty data object (keys=[])")
    return {
        success: false,
        error: "No data provided. Include at least one field to save.",
    }
}
```

### Log verification after deploy

```
Convex logs should show:
- "[updateStageData] Rejected: empty data object" (new guard working)
- NO more OCC cascade on same document ID
- [PLAN-CAPTURE] logs now visible (no longer flooded)
```

---

## Phase 1.5: Verify Bug 4 Assumption

**Dependency**: Bug 1 deployed — logs no longer flooded
**Action**: Read Convex logs, search for [PLAN-CAPTURE] no plan-spec detected entries
**Look for**: hasUnfenced=true or hasUnfenced=false

### Decision gate

- hasUnfenced=true → model DOES emit plan YAML in tools-path, just not captured → proceed with Bug 3 fix (fallback extraction)
- hasUnfenced=false → model does NOT emit plan in tools-path → Bug 3 fallback won't help, need alternative (instruction reinforcement in skills, or auto-advance plan from tool results)

**Do NOT implement Bug 3 until this gate passes.**

---

## Phase 2a: Bug 3 — Tools Path Plan Fallback (conditional on Phase 1.5)

**Priority**: Medium
**File**: `src/app/api/chat/route.ts`
**Locations**: line 53 (imports), line 3385-3389 (onFinish plan capture)

### Step 1: Update import (line 53)

```diff
- import { PLAN_DATA_PART_TYPE, type PlanSpec } from "@/lib/ai/harness/plan-spec"
+ import { PLAN_DATA_PART_TYPE, type PlanSpec, UNFENCED_PLAN_REGEX, planSpecSchema } from "@/lib/ai/harness/plan-spec"
```

### Step 2: Add fallback extraction (line 3385-3389)

Replace the diagnostic-only block with fallback + persist:

```
route.ts:3385-3389 (current: log-only diagnostic)
```

```typescript
if (!capturedPlanSpec && paperStageScope) {
    // Fallback: extract unfenced plan-spec from rawText
    // (same pattern as search path in orchestrator.ts:974-991)
    UNFENCED_PLAN_REGEX.lastIndex = 0
    const unfencedMatch = UNFENCED_PLAN_REGEX.exec(rawText)
    if (unfencedMatch) {
        try {
            const { default: yaml } = await import("js-yaml")
            const parsed = yaml.load(unfencedMatch[1])
            const result = planSpecSchema.safeParse(parsed)
            if (result.success) {
                capturedPlanSpec = result.data
                console.info(`[PLAN-CAPTURE] fallback extracted from rawText (tools path) stage=${paperStageScope} tasks=${result.data.tasks.length}`)
            }
        } catch { /* yaml parse fail — ignore */ }
    }
    if (!capturedPlanSpec) {
        const planProbe = rawText.substring(0, 500).replace(/\n/g, "\\n")
        const hasFenced = rawText.includes("```plan-spec")
        const hasUnfenced = /stage:\s*\w+\s*\nsummary:/.test(rawText)
        console.info(`[PLAN-CAPTURE] no plan-spec detected in response (stage=${paperStageScope}) hasFenced=${hasFenced} hasUnfenced=${hasUnfenced} rawTextLen=${rawText.length} probe=${planProbe}`)
    }
}
```

Note: capturedPlanSpec is let (line 2958), so reassignment is valid. The existing persist block at line 3391-3402 will pick up the fallback value.

---

## Phase 2b: Bug 2 — Enforcer Plan Completion Check (parallel with 2a)

**Priority**: Medium
**File**: `src/app/api/chat/route.ts`
**Location**: line 2380-2384 (enforcer activation guard)

### What

Add _plan completion check before enforcer activates. If plan has incomplete tasks AND action is finalize_stage, downgrade — don't activate enforcer.

### Where exactly

```
route.ts:2380-2381 (shouldEnforceArtifactChain computation)
```

### Implementation

```typescript
const shouldEnforceArtifactChain =
    resolvedWorkflow?.action !== "continue_discussion"

// Plan completion gate: if plan exists with incomplete tasks,
// don't enforce artifact chain on finalize — let model continue discussion.
const currentPlan = (paperSession?.stageData as Record<string, Record<string, unknown>> | undefined)
    ?.[paperStageScope ?? ""]?._plan as PlanSpec | undefined
const planHasIncompleteTasks = currentPlan?.tasks?.some(
    (t: { status: string }) => t.status !== "complete"
) ?? false

if (shouldEnforceArtifactChain && planHasIncompleteTasks && resolvedWorkflow?.action === "finalize_stage") {
    console.info(`[PLAN-GATE] enforcer downgraded: plan has incomplete tasks (${currentPlan?.tasks.filter((t: { status: string }) => t.status === "complete").length}/${currentPlan?.tasks.length} complete)`)
}

const draftingChoiceArtifactEnforcer =
    choiceInteractionEvent && paperStageScope && paperSession?.stageStatus === "drafting"
    && shouldEnforceArtifactChain && !(planHasIncompleteTasks && resolvedWorkflow?.action === "finalize_stage")
        ? ({ steps, stepNumber }: { ... }) => {
            // ... existing enforcer body unchanged
```

### Behavior change

- Plan incomplete + finalize_stage → enforcer NOT activated → model responds normally (as if continue_discussion)
- Plan complete + finalize_stage → enforcer activates normally → chain runs
- No plan (_plan undefined) → planHasIncompleteTasks = false → enforcer activates normally (backwards compatible)

---

## Bug 4: No Implementation Needed

Resolves automatically when Bug 3 fix captures plan-spec from tools-path turns.
If Phase 1.5 gate shows hasUnfenced=false, alternative approach needed (documented in analytic-result.md audit gap).

---

## Verification Checklist

After all phases deployed to dev (wary-ferret-59):

- [ ] **Bug 1**: Trigger enforcer chain → Convex logs show "Rejected: empty data object", NO OCC cascade
- [ ] **Bug 1**: [PLAN-CAPTURE] logs visible in Convex (not flooded)
- [ ] **Phase 1.5**: hasUnfenced=true/false value confirmed from logs
- [ ] **Bug 3** (if applicable): Tools-path turn shows [PLAN-CAPTURE] fallback extracted from rawText
- [ ] **Bug 3** (if applicable): _plan in DB updates after tools-path turn (not stale)
- [ ] **Bug 2**: Trigger finalize_stage with incomplete plan → log shows [PLAN-GATE] enforcer downgraded, model responds normally
- [ ] **Bug 2**: Trigger finalize_stage with complete plan → enforcer activates, chain runs
