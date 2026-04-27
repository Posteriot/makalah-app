# Current Architecture Audit

## Scope

This audit focuses on the current chat and paper workflow runtime:

- entry boundary
- runtime orchestration
- context assembly
- policy
- tool registry
- paper tools
- backend mutations
- persistence
- verification

## Executive Assessment

The current architecture is not broken. It already has several strong production properties:

- explicit run persistence
- step persistence
- event logging
- pause/resume infrastructure
- deterministic backend mutations
- stage-specific product logic

The over-engineering concern is narrower and more specific:

- too much domain sequencing lives outside explicit domain tools
- the harness often drives "what comes next"
- prompts and policy collaborate to over-constrain the model

## Current Layer Map

### 1. HTTP and runtime boundary

Primary files:

- `src/app/api/chat/route.ts`
- `src/lib/chat-harness/runtime/run-chat-harness.ts`
- `src/lib/chat-harness/runtime/orchestrate-sync-run.ts`

Assessment:

- strong and appropriate separation
- the route is thin
- the runtime adapter is thin
- orchestration is centralized

This area should largely remain in the harness.

### 2. Entry and request acceptance

Primary files:

- `src/lib/chat-harness/entry/accept-chat-request.ts`
- `src/lib/chat-harness/entry/resolve-conversation.ts`
- `src/lib/chat-harness/entry/resolve-run-lane.ts`
- `src/lib/chat-harness/entry/persist-user-message.ts`

Assessment:

- correct control-plane ownership
- appropriate for the harness
- not a primary source of over-engineering

### 3. Context assembly

Primary files:

- `src/lib/chat-harness/context/assemble-step-context.ts`
- `src/lib/chat-harness/context/resolve-instruction-stack.ts`
- `src/lib/chat-harness/context/resolve-search-decision.ts`
- `src/lib/chat-harness/context/execute-web-search-path.ts`

Assessment:

- context assembly is a legitimate harness responsibility
- however, the search path has grown into a semi-specialized orchestration mode
- this makes search feel less like a model-selectable domain capability and more like a separate runtime branch

Risk:

- medium architectural complexity

### 4. Policy layer

Primary files:

- `src/lib/chat-harness/policy/evaluate-runtime-policy.ts`
- `src/lib/chat-harness/policy/enforcers.ts`
- `src/lib/chat-harness/policy/compose-prepare-step.ts`
- `src/lib/chat-harness/policy/build-tool-boundary-policy.ts`

Assessment:

- this is the clearest over-engineered area
- the policy layer currently does more than classify runtime boundaries
- it constructs domain-specific chain behavior

Current behavior includes:

- revision chain forcing
- drafting artifact chain forcing
- reactive forcing after certain tools
- execution boundary labels partly derived from forced domain flows

This is where the model most clearly becomes an executor on rails.

### 5. Tool registry

Primary file:

- `src/lib/chat-harness/executor/build-tool-registry.ts`

Assessment:

- very large file
- contains significant domain behavior, validation, guard logic, and rescue interaction
- tool wrappers are no longer thin executors

Symptoms:

- guard logic duplicated with backend legality
- tool descriptions carry heavy operational burden
- execute handlers do more than map inputs to domain actions

### 6. Paper tool layer

Primary file:

- `src/lib/ai/paper-tools.ts`

Assessment:

- necessary domain integration point
- but currently overloaded
- mixes tool surface, operational guidance, normalization, state protection, and some rescue assumptions

This file should become the clean catalog of domain tools, but it is not there yet.

### 7. Prompt doctrine

Primary files:

- `src/lib/ai/paper-mode-prompt.ts`
- `src/lib/ai/paper-stages/core.ts`
- `src/lib/ai/paper-stages/foundation.ts`
- `src/lib/ai/paper-stages/results.ts`
- `src/lib/ai/paper-stages/finalization.ts`

Assessment:

- prompts encode a large amount of step choreography
- many rules are operationally useful, but together they function as a shadow controller

Examples of current prompt posture:

- force same-turn action bundles
- force ordering between artifact save and validation
- prohibit stopping before a sequence completes

This makes the model more obedient to choreography than adaptive to state.

### 8. Backend mutations and state machine

Primary file:

- `convex/paperSessions.ts`

Related:

- `convex/stageSkills.ts`
- `src/lib/chat-harness/rollback/compute-rollback-plan.ts`

Assessment:

- backend is the correct home for state legality
- many domain actions already exist here:
  - `cancelChoiceDecision`
  - `unapproveStage`
  - `updateStageData`
  - `compileDaftarPustaka`
  - `requestRevision`
  - `autoRescueRevision`
  - `rewindToStage`

This is a strength, not a problem.

The main issue is that not all of these domain actions are exposed cleanly as first-class model tools.

### 9. Persistence and observability

Primary files:

- `src/lib/chat-harness/persistence/run-store.ts`
- `src/lib/chat-harness/persistence/event-store.ts`
- `convex/harnessRuns.ts`
- `convex/harnessRunSteps.ts`
- `convex/harnessEvents.ts`
- `convex/harnessDecisions.ts`

Assessment:

- strong architectural area
- appropriately thin adapters
- correct control-plane ownership
- should be preserved

### 10. Verification

Primary files:

- `src/lib/chat-harness/verification/verify-step-outcome.ts`
- `src/lib/chat-harness/verification/index.ts`

Assessment:

- correct harness concern
- should remain outside domain tool choreography
- should continue to validate outcomes after model-selected actions

## Architectural Strengths

1. Thin HTTP boundary already exists.
2. Persistence adapters are correctly thin.
3. Backend mutations encode valuable workflow legality.
4. Observability is stronger than in many toy agent systems.
5. Pause/resume already exists as a real harness concern.

## Architectural Risks

1. Domain choreography is split across too many layers.
2. The policy layer is acting as an implicit director.
3. Tool wrappers are too heavy.
4. Search is too special-cased as orchestration.
5. Prompt doctrine duplicates system law.
6. Auto-rescue reduces clarity around illegal versus legal action.

## Best Recommendation

The strongest move is not to discard the harness.

The strongest move is to:

- preserve the current control-plane strengths
- move domain action selection into explicit tools
- remove domain sequencing from policy
- simplify prompt choreography
- harden backend contract ownership

## Files Reviewed

- `src/app/api/chat/route.ts`
- `src/lib/chat-harness/runtime/run-chat-harness.ts`
- `src/lib/chat-harness/runtime/orchestrate-sync-run.ts`
- `src/lib/chat-harness/context/assemble-step-context.ts`
- `src/lib/chat-harness/context/execute-web-search-path.ts`
- `src/lib/chat-harness/policy/evaluate-runtime-policy.ts`
- `src/lib/chat-harness/policy/enforcers.ts`
- `src/lib/chat-harness/policy/compose-prepare-step.ts`
- `src/lib/chat-harness/policy/build-tool-boundary-policy.ts`
- `src/lib/chat-harness/executor/build-tool-registry.ts`
- `src/lib/ai/paper-tools.ts`
- `src/lib/ai/paper-mode-prompt.ts`
- `convex/paperSessions.ts`
- `src/lib/chat-harness/persistence/run-store.ts`
- `src/lib/chat-harness/persistence/event-store.ts`
- `src/lib/chat-harness/verification/verify-step-outcome.ts`
