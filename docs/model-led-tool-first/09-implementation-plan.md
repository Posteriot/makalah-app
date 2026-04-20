# Implementation Plan: Model-Led Tool-First Refactor

## Summary

This plan converts the architecture direction into an implementation sequence that minimizes regression risk.

## Guiding Rule

Do not delete hidden control before replacing it with explicit capability, legality, and verification.

## Phase 1: Capability Visibility

### Goal

Make legal domain actions visible to the model before removing any major policy choreography.

### Work

1. Define backend-derived `getStageCapabilities`.
2. Add a tool wrapper for `getStageCapabilities`.
3. Document how prompts should consume this tool.
4. Ensure capability output is stable and auditable.

### Files

- `src/lib/ai/paper-tools.ts`
- `src/lib/chat-harness/executor/build-tool-registry.ts`
- backend helper location to be chosen from `convex/paperSessions.ts` or supporting module

### Exit criteria

- model can inspect allowed and blocked actions explicitly
- tool output is deterministic

## Phase 2: Expose Missing Domain Tools

### Goal

Give the model a complete enough tool room for domain decisions.

### Work

1. Expose `cancelChoiceDecision`.
2. Expose `unapproveStage`.
3. Expose `rewindToStage`.
4. Expose `rollbackArtifactVersion` if backend path is suitable.
5. Add `inspectStoredSources` if needed.

### Files

- `src/lib/ai/paper-tools.ts`
- `src/lib/chat-harness/executor/build-tool-registry.ts`
- `convex/paperSessions.ts`
- `convex/stageSkills.ts`

### Exit criteria

- core workflow reset and validation actions are explicit tools

## Phase 3: Harden Backend Contracts

### Goal

Make backend legality sufficient so wrapper-level choreography can shrink safely.

### Work

1. Audit legality of `updateStageData`.
2. Audit legality of `createArtifact`.
3. Audit legality of `updateArtifact`.
4. Audit legality of `submitStageForValidation`.
5. Review current auto-rescue behavior.
6. Convert missing legality checks into backend contracts.

### Files

- `convex/paperSessions.ts`
- `convex/stageSkills.ts`
- tests under `convex/*.test.ts`

### Exit criteria

- backend can reliably reject illegal domain actions without policy chains

## Phase 4: Thin Tool Wrappers

### Goal

Reduce domain logic embedded in tool execute handlers.

### Work

1. Simplify `src/lib/ai/paper-tools.ts`.
2. Simplify `src/lib/chat-harness/executor/build-tool-registry.ts`.
3. Remove harness-side silent rescue paths where possible.
4. Ensure tool results remain explicit and corrective.

### Exit criteria

- wrappers are mostly adapter and result-shaping code

## Phase 5: Remove Policy Choreography

### Goal

Eliminate hidden domain sequencing from policy.

### Work

1. Remove `universalReactiveEnforcer`.
2. Remove `draftingChoiceArtifactEnforcer`.
3. Remove `revisionChainEnforcer`.
4. Simplify `composePrepareStep`.
5. Redefine execution boundary labels.
6. Keep policy snapshot and runtime posture only.

### Files

- `src/lib/chat-harness/policy/enforcers.ts`
- `src/lib/chat-harness/policy/evaluate-runtime-policy.ts`
- `src/lib/chat-harness/policy/compose-prepare-step.ts`
- `src/lib/chat-harness/policy/build-tool-boundary-policy.ts`
- `src/lib/chat-harness/policy/map-policy-boundary.ts`

### Exit criteria

- policy no longer chooses domain sequences

## Phase 6: Rewrite Prompt Doctrine

### Goal

Replace imperative choreography with explicit action contracts.

### Work

1. Rewrite `paper-mode-prompt.ts`.
2. Rewrite stage prompt files under `src/lib/ai/paper-stages/**`.
3. Replace "must do X then Y" wording with:
   - stage goals
   - allowed actions
   - blocked actions
   - success criteria

### Exit criteria

- prompts stop acting like a shadow controller

## Phase 7: Search Path Refactor

### Goal

Move search toward explicit model-selected capability without losing operational safeguards.

### Work

1. Define explicit search tool posture.
2. Separate search-as-capability from search-as-runtime-special-case concerns.
3. Retain billing and trace controls.
4. Reduce orchestration branching where safe.

### Files

- `src/lib/chat-harness/context/execute-web-search-path.ts`
- related search context modules

### Exit criteria

- search is easier to reason about as an explicit capability

## Testing Plan

### Unit and contract tests

- backend legality tests for all domain mutations
- tool wrapper tests for explicit result contracts
- capability output tests for `getStageCapabilities`

### Integration tests

- drafting happy path
- revision path
- validation panel interactions
- cancel choice path
- rewind path
- bibliography path
- search then save path

### Regression checks

- run persistence still coherent
- event emission still coherent
- pause/resume still works
- verification blockers still surface correctly

## Recommended Starting Slice

The best first slice is:

1. implement `getStageCapabilities`
2. expose `cancelChoiceDecision`, `unapproveStage`, and `rewindToStage`
3. do not remove enforcers yet

Why:

- it gives the model explicit action awareness
- it reduces hidden architecture immediately
- it creates the conditions for safe later removal of policy choreography
