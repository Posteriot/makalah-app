# Design Doc: Model-Led Tool-First Refactor

## Summary

This design proposes a targeted refactor of makalahapp's chat and paper workflow runtime.

The goal is to preserve the current system's strong control-plane features while moving domain sequencing away from policy choreography and into explicit model-selected tools backed by deterministic backend contracts.

## Design Decision

### Chosen architecture

- thin harness control plane
- explicit domain tool surface
- hard backend legality
- verification-driven completion

### Rejected extremes

Rejected architecture 1:

- keep the current heavy policy/enforcer approach

Reason:

- it over-constrains the model and duplicates domain sequencing across layers

Rejected architecture 2:

- turn everything into tools, including runtime lifecycle

Reason:

- run lifecycle, context assembly, persistence, and verification are not domain actions and should remain in the harness

## Design Goals

1. Make the model the primary selector of domain actions.
2. Remove hidden domain sequencing from policy.
3. Preserve control-plane strengths.
4. Make backend state legality the single source of truth.
5. Improve architectural clarity.

## Target Architecture

## Layer 1: Harness control plane

Responsibilities:

- accept request
- resolve conversation
- create or resume run
- assemble context
- expose tool catalog
- stream model step
- persist run, step, and events
- verify outcome
- pause or resume if needed

Primary files affected:

- `src/lib/chat-harness/runtime/**`
- `src/lib/chat-harness/entry/**`
- `src/lib/chat-harness/context/**`
- `src/lib/chat-harness/persistence/**`
- `src/lib/chat-harness/verification/**`

## Layer 2: Domain tool surface

Responsibilities:

- expose user-meaningful workflow actions
- return explicit outcomes
- avoid hidden choreography

Primary files affected:

- `src/lib/ai/paper-tools.ts`
- `src/lib/chat-harness/executor/build-tool-registry.ts`

## Layer 3: Backend domain contracts

Responsibilities:

- enforce legal state transitions
- validate required fields and artifact legality
- reject invalid actions explicitly

Primary files affected:

- `convex/paperSessions.ts`
- `convex/stageSkills.ts`

## Layer 4: Prompt doctrine

Responsibilities:

- describe state
- describe allowed actions
- describe blocked actions
- describe success criteria

Primary files affected:

- `src/lib/ai/paper-mode-prompt.ts`
- `src/lib/ai/paper-stages/**`

## Key Structural Changes

### Change 1: add capability visibility

Introduce `getStageCapabilities` so the model can inspect legal actions directly from backend-derived state.

### Change 2: expose missing domain actions as tools

Promote backend actions such as:

- `cancelChoiceDecision`
- `unapproveStage`
- `rewindToStage`
- `rollbackArtifactVersion`

into explicit model-facing tool capabilities.

### Change 3: remove domain enforcers

Retire:

- revision chain forcing
- drafting artifact chain forcing
- universal reactive forcing

### Change 4: simplify tool wrappers

Make tool execute handlers thinner by:

- removing hidden rescue orchestration
- reducing duplicated business choreography
- keeping clear normalization and result shaping only

### Change 5: simplify policy layer

Policy remains for:

- runtime posture
- approval and boundary summaries
- persistence of operator-visible execution state

Policy no longer sequences domain actions.

### Change 6: rewrite prompts

Shift prompts away from imperative choreography and toward:

- state awareness
- capability awareness
- contract awareness

## Search Design Posture

Search is a special case.

Best recommendation:

- first treat search as an explicit model-facing capability
- do not immediately collapse all search orchestration internals
- preserve billing, persistence, and trace controls during migration

This reduces risk while still moving toward the desired architectural model.

## Expected Benefits

1. Model feels less trapped.
2. Domain behavior becomes more explicit.
3. Backend legality becomes clearer.
4. Policy becomes easier to understand and maintain.
5. Debugging improves because actions are explicit rather than inferred from hidden chains.

## Trade-Offs

1. The model will initially make more visible wrong choices if hidden enforcers are removed too early.
2. Backend contracts must become stronger and clearer.
3. Prompt doctrine will need careful rewrite to avoid losing too much structure at once.

## Best Recommendation

Implement the refactor in staged layers rather than as a big-bang rewrite.

That preserves current product stability while progressively moving architectural ownership to the right places.
