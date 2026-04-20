# Policy Layer Removal Mapping

## Purpose

This document identifies what should be removed from the policy layer, what should remain, and why.

The target is not "no policy."

The target is:

- no domain choreography in policy
- only runtime-level policy remaining in the harness

## Current Policy Files

- `src/lib/chat-harness/policy/evaluate-runtime-policy.ts`
- `src/lib/chat-harness/policy/enforcers.ts`
- `src/lib/chat-harness/policy/compose-prepare-step.ts`
- `src/lib/chat-harness/policy/build-tool-boundary-policy.ts`
- `src/lib/chat-harness/policy/map-policy-boundary.ts`

## Remove Entirely from Policy

### 1. Revision chain enforcement

Current source:

- `createRevisionChainEnforcer` in `enforcers.ts`

Why remove:

- it explicitly forces the model through a sequence of domain actions
- sequence legality should be learned through tool contracts and backend responses
- it turns the harness into a domain director

Replacement:

- explicit `requestRevision`, `updateStageData`, `updateArtifact`, `submitStageForValidation` tools
- backend legality checks
- clear tool results when the model chooses incorrectly

### 2. Drafting choice artifact enforcement

Current source:

- `createDraftingChoiceArtifactEnforcer` in `enforcers.ts`

Why remove:

- it encodes hidden domain sequencing in policy
- it assumes the harness should choose when artifact chains begin and how they progress

Replacement:

- model chooses from explicit tools
- stage prompt describes stage goals and legal actions
- backend rejects illegal lifecycle transitions

### 3. Universal reactive enforcement

Current source:

- `createUniversalReactiveEnforcer` in `enforcers.ts`

Why remove:

- it forces follow-up actions after prior tool usage
- it is the clearest example of policy deciding the next domain move

Replacement:

- model interprets tool results
- verification surfaces blockers
- backend remains authoritative on legality

### 4. Domain-chain composition in prepare-step

Current source:

- `composePrepareStep`

Why remove:

- this is the mechanism that combines multiple domain enforcers into a hidden control chain

Replacement:

- use prepare-step only for runtime-level concerns if still needed
- do not use it to direct domain tool sequences

### 5. Execution boundary names tied to domain forcing

Current source:

- `build-tool-boundary-policy.ts`

Current values that should be removed or redefined:

- `revision-chain`
- `forced-submit` when it simply means a domain step was forced

Why remove:

- runtime boundary labels should describe runtime constraints, not hidden domain choreography

## Shrink, Not Fully Remove

### 1. Runtime policy evaluation

Current source:

- `evaluate-runtime-policy.ts`

What should remain:

- policy snapshot persistence
- runtime boundary classification
- approval mode representation
- operator-visible audit context

What should be removed:

- assembling domain enforcers
- domain-specific forced sequencing

### 2. Tool boundary classification

Current source:

- `build-tool-boundary-policy.ts`
- `map-policy-boundary.ts`

What should remain:

- broad runtime-level categories

Possible future categories:

- `normal`
- `read_only`
- `mutation_allowed`
- `approval_required`

What should disappear:

- boundary categories that are simply a proxy for hidden domain choreography

## Keep in Policy

### 1. Approval posture

Examples:

- whether runtime currently requires an operator-visible approval checkpoint
- whether a pending decision exists

### 2. Runtime visibility and audit state

Examples:

- current boundary summary
- policy snapshot persistence
- operator-readable policy reasoning

### 3. Narrow runtime safety rules

Examples:

- non-domain execution gating
- sandbox or approval posture summaries

These are control-plane concerns, not domain choreography.

## Mapping Table

| Current Policy Logic | Action | New Home |
| --- | --- | --- |
| Revision chain enforcer | Remove | Tools + backend guards |
| Drafting artifact chain enforcer | Remove | Tools + backend guards |
| Universal reactive enforcer | Remove | Tool results + verification |
| Chained prepare-step sequencing | Remove | No replacement as policy |
| Domain-driven execution boundary labels | Remove or redefine | Runtime-only boundary model |
| Policy snapshot persistence | Keep | Policy layer |
| Approval posture summary | Keep | Policy layer |
| Operator-visible runtime boundary summary | Keep | Policy layer |

## Best Recommendation

The policy layer should survive, but in a much smaller role.

It should become:

- a runtime posture and audit layer

It should stop being:

- a hidden domain workflow controller
