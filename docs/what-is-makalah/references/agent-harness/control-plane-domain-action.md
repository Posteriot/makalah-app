# Control Plane vs Domain Actions Mapping

## Purpose

This document defines the most important architectural boundary in the refactor:

- what must remain in the harness control plane
- what should become or remain explicit domain tools
- what must be enforced by backend contracts

This mapping is the canonical reference for later design and implementation work.

## High-Level Rule

### Keep in control plane

If the behavior exists to operate the runtime itself, keep it in the harness.

### Make a domain tool

If the behavior is a user-meaningful workflow action, expose it as a tool.

### Enforce in backend

If the behavior is a legality rule, state invariant, or transition guard, enforce it in Convex.

## Control Plane Responsibilities

These should remain harness-owned.

### Entry and run lifecycle

- request acceptance
- authentication and request ownership
- conversation resolution
- run creation and claiming
- step creation and completion
- pause and resume infrastructure
- mapping runtime results to HTTP and stream responses

Primary files:

- `src/lib/chat-harness/runtime/run-chat-harness.ts`
- `src/lib/chat-harness/runtime/orchestrate-sync-run.ts`
- `src/lib/chat-harness/entry/**`

### Context assembly

- instruction precedence
- message conversion and sanitization
- attachment and source context assembly
- context budget application

Primary files:

- `src/lib/chat-harness/context/assemble-step-context.ts`
- `src/lib/chat-harness/context/resolve-instruction-stack.ts`
- `src/lib/chat-harness/context/apply-context-budget.ts`

### Persistence and observability

- run persistence
- step persistence
- event persistence
- pending decision persistence
- policy snapshot persistence

Primary files:

- `src/lib/chat-harness/persistence/**`
- `convex/harnessRuns.ts`
- `convex/harnessRunSteps.ts`
- `convex/harnessEvents.ts`
- `convex/harnessDecisions.ts`

### Verification

- step outcome verification
- completion blockers
- run readiness checks

Primary files:

- `src/lib/chat-harness/verification/**`

## Domain Tools

These are actions the model should be able to choose directly.

### State inspection tools

- `getCurrentPaperState`
- `getStageCapabilities`
- `readArtifact`
- `inspectStoredSources`

Rationale:

- the model should be able to inspect workflow state before acting
- `getStageCapabilities` is especially important as the replacement for hidden enforcer knowledge

### Search and evidence tools

- `searchReferences`
- `inspectStoredSources`
- exact-source inspection tools when needed

Rationale:

- search should feel like an explicit capability, not a separate orchestration mode

### Stage progress tools

- `updateStageData`
- `compileDaftarPustaka`

Rationale:

- these represent meaningful progress actions on the paper

### Artifact tools

- `createArtifact`
- `updateArtifact`
- `rollbackArtifactVersion`

Rationale:

- artifact creation and revision should be explicit decisions by the model

### Validation lifecycle tools

- `submitStageForValidation`
- `requestRevision`
- `unapproveStage`

Rationale:

- these are user-visible workflow state changes

### Choice and workflow reset tools

- `emitChoiceCard`
- `cancelChoiceDecision`
- `rewindToStage`

Rationale:

- these are domain actions with real workflow meaning

## Backend Contract Responsibilities

The following must be enforced by Convex mutations and queries, not by prompt obedience or policy choreography.

### Legal state transitions

Examples:

- `requestRevision` only from `pending_validation`
- `submitStageForValidation` only when required stage conditions are met
- `rewindToStage` only for legal targets
- `cancelChoiceDecision` only when cancellation semantics are valid

Primary file:

- `convex/paperSessions.ts`

### Artifact legality

Examples:

- when create vs update is legal
- whether a valid artifact already exists
- whether invalidated artifacts can be replaced

Primary files:

- `convex/paperSessions.ts`
- `convex/stageSkills.ts`

### Search and reference legality

Examples:

- source attachment contracts
- bibliography persistence legality
- exact source availability rules

Primary files:

- `convex/paperSessions.ts`
- `src/lib/ai/artifact-sources-policy.ts`

## Mapping Table

| Behavior | Control Plane | Domain Tool | Backend Guard |
| --- | --- | --- | --- |
| Accept request | Yes | No | Partial |
| Resolve conversation | Yes | No | No |
| Create run / step | Yes | No | Partial |
| Pause / resume | Yes | No | Yes |
| Assemble context | Yes | No | No |
| Search references | Minimal infra only | Yes | Partial |
| Inspect stored sources | No | Yes | Partial |
| Save stage data | No | Yes | Yes |
| Create artifact | No | Yes | Yes |
| Update artifact | No | Yes | Yes |
| Submit for validation | No | Yes | Yes |
| Request revision | No | Yes | Yes |
| Cancel choice decision | No | Yes | Yes |
| Unapprove stage | No | Yes | Yes |
| Rewind stage | No | Yes | Yes |
| Rollback artifact version | No | Yes | Yes |
| Event persistence | Yes | No | No |
| Verification | Yes | No | Partial |

## Best Recommendation

The correct architectural move is:

- make domain action selection explicit through tools
- keep runtime infrastructure in the harness
- make backend guards the single source of truth for legality

That gives the model autonomy without sacrificing workflow correctness.
