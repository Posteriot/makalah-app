# Problem Statement and Goals

## Summary

Makalahapp's current chat harness is functional and already contains strong persistence, observability, and workflow enforcement. However, the current architecture pushes too much domain sequencing into the harness and prompt layer.

As a result:

- the model often behaves more like a constrained executor than a primary decision maker
- domain flow is partially duplicated across prompts, policy, tool wrappers, and backend mutations
- some recovery behaviors are hidden from the model
- architectural boundaries are harder to reason about than they need to be

The proposed shift is toward a model-led, tool-first architecture.

## Problem Statement

### Problem 1: domain choreography lives in too many places

The current system expresses domain sequencing in multiple layers:

- policy enforcers in `src/lib/chat-harness/policy/enforcers.ts`
- policy composition in `src/lib/chat-harness/policy/compose-prepare-step.ts`
- runtime policy assembly in `src/lib/chat-harness/policy/evaluate-runtime-policy.ts`
- prompt instructions in `src/lib/ai/paper-mode-prompt.ts`
- stage-specific instruction files under `src/lib/ai/paper-stages/**`
- tool wrappers and domain logic in `src/lib/chat-harness/executor/build-tool-registry.ts` and `src/lib/ai/paper-tools.ts`

This produces a system where the next action is often driven by harness choreography rather than by explicit model choice over domain tools.

### Problem 2: the model feels constrained beyond necessary safety limits

The harness currently does more than preserve legality and safety.

It also:

- forces tool sequences
- routes some turns through specialized orchestration paths
- performs hidden rescue behavior after illegal or mistimed tool selections

This makes the model feel "trapped" compared with the intended mental model of a capable agent choosing among well-defined tools in a constrained environment.

### Problem 3: hidden rescue weakens architectural clarity

Auto-rescue behavior exists both in backend mutations and harness-level helpers.

Examples include revision rescue around pending validation:

- `src/lib/chat-harness/shared/auto-rescue-policy.ts`
- `convex/paperSessions.ts`

When rescue is implicit:

- the model receives a distorted picture of what actions are legal
- debugging becomes harder
- domain legality is split between explicit rule and implicit fallback

### Problem 4: prompts are doing too much systems work

The paper-mode prompt and stage prompt files currently encode many imperative sequence rules, such as:

- call A before B
- complete tools in the same turn
- do not stop until C

These instructions are useful as temporary discipline, but they also function as a shadow controller layered on top of the real runtime and backend contracts.

### Problem 5: search behavior is overly special-cased

The web search path in `src/lib/chat-harness/context/execute-web-search-path.ts` behaves like a dedicated orchestration mode instead of a simple model-selectable domain capability.

That may be valid for cost and tracing concerns, but architecturally it reduces the model's apparent tool autonomy.

## Goals

### Primary Goal

Refactor the runtime so the model becomes the primary selector of domain actions while preserving the workflow correctness guarantees that makalahapp depends on.

### Architectural Goals

1. Move domain behavior toward explicit tools.
2. Keep the harness focused on runtime control-plane duties.
3. Move legality and state transition enforcement to backend contracts.
4. Reduce hidden or silent rescue behavior.
5. Simplify prompt instructions from choreography into contracts and goals.
6. Preserve persistence, observability, pause/resume, and verification quality.

### Product Goals

1. Make the model feel more capable and less mechanically constrained.
2. Improve debuggability by making domain actions explicit.
3. Reduce duplication of domain sequencing across layers.
4. Improve maintainability by clarifying architectural ownership.

## Non-Goals

This initiative does not aim to:

1. Remove the harness.
2. Remove workflow state discipline.
3. Allow the model to mutate state without deterministic backend validation.
4. Replace deterministic verification with purely LLM-based judgment.
5. Redesign the entire paper workflow product at the same time.
6. Remove all policy logic; only domain choreography should be removed from policy.

## Constraints

### Product constraints

- makalahapp is workflow-driven, not a free-form sandbox editor
- stage legality matters
- validation and revision semantics matter
- rewind and rollback can have destructive effects and require careful auditability

### Technical constraints

- the runtime already has production-critical persistence around runs, steps, and events
- the UI already depends on existing pause/resume and validation patterns
- many stage instructions already assume specific tool availability and sequencing
- the search path has billing, tracing, and persistence implications

## Success Criteria

The architectural shift is successful if:

1. domain sequencing is primarily represented through explicit tool choices and backend legality, not hidden harness chains
2. the policy layer no longer forces revision/artifact/submit sequences
3. the model can choose from a clear catalog of domain tools
4. backend mutations reject illegal transitions deterministically
5. observability remains at least as strong as before
6. verification quality does not regress

## Core Recommendation

The best direction for makalahapp is:

- keep a thin but strong harness
- move domain actions into tools
- keep backend guards hard
- remove domain choreography from policy and prompt layers as much as possible
