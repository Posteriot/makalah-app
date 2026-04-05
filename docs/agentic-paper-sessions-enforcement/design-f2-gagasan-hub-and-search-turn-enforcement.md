# Design — F2: Gagasan Hub and Search-Turn Enforcement

> Branch: `feature/paper-sessions-enforcement`
> Worktree: `.worktrees/agentic-paper-sessions-enforcement`
> Date: 2026-04-03
> Basis: `findings.md`, `handoff-f2-gagasan-hub.md`, and codebase verification against current files

---

## Status

F2 is **not** an instruction-only problem.

Codebase verification shows two separate gaps:

1. Stage instructions and global paper prompt still treat too many stages with the same search pattern.
2. Runtime search flow has no post-search enforcement that guarantees the final user-facing response contains actual findings from the completed search turn.

Because of that, F2 must cover both:

- instruction rewrite
- state-based runtime enforcement

This design intentionally avoids regex-based policing.

---

## Problem

The intended stage behavior is:

- `gagasan` should be the main discussion and research hub
- `topik` should derive from existing material, not launch fresh search
- `tinjauan_literatur` should perform deeper academic search
- later stages should execute and review from approved material, not keep re-opening search

The current system does not enforce that split reliably.

Observed product failure:

- A search turn can complete successfully in the backend
- citations and references can be persisted
- but the user still receives a final answer that sounds like a pre-search transition, such as "I will search" or "please wait"

That means stage intent and search completion are not being translated into a reliable response contract.

---

## Verified Evidence

### 1. Global prompt is still too generic

In [paper-mode-prompt.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/ai/paper-mode-prompt.ts#L284):

- `DISCUSS FIRST before drafting` still applies globally
- there is no clear stage-mode contract
- there is no positive rule saying that a completed search turn must produce actual findings

In [paper-mode-prompt.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/ai/paper-mode-prompt.ts#L288):

- the prompt says not to say "please wait"
- but it does not enforce what must be said instead after search succeeds

### 2. `gagasan` is not yet a proactive research hub

In [foundation.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/ai/paper-stages/foundation.ts#L106):

- `gagasan` still treats search as conditional or optional
- it does not strongly define dual-search behavior
- it does not require same-turn presentation of findings after search

### 3. `topik` still assumes fresh search

In [foundation.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/ai/paper-stages/foundation.ts#L227):

- `referensiPendukung` is still framed as additional literature from web search
- this keeps `topik` tied to fresh search instead of derivation from `gagasan`

### 4. Runtime still treats `topik` as a search-evidence stage

In [route.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/app/api/chat/route.ts#L890):

- search evidence for `topik` is still read from `referensiPendukung`
- this means runtime policy still assumes `topik` is expected to gather fresh search results

### 5. No runtime guard after search compose

In [route.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/app/api/chat/route.ts#L2300), search requests go into `executeWebSearch(...)`.

In [orchestrator.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/ai/web-search/orchestrator.ts#L554):

- compose phase builds search result context and streams model output

In [orchestrator.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/ai/web-search/orchestrator.ts#L799):

- final output is formatted and persisted
- but there is no validation that `composedText` actually contains findings from the completed search

So the screenshot bug is structurally possible in the current codebase even if search succeeds.

---

## Goals

F2 must achieve all of the following:

1. `gagasan` becomes the main discussion and research hub.
2. `topik` becomes derivation-only.
3. `tinjauan_literatur` becomes deep academic search mode.
4. Later stages become execution/review stages by default.
5. Completed search turns must present actual findings in the same turn.
6. Enforcement must not use regex.

---

## Non-Goals

F2 will not:

- redesign artifact persistence
- redesign approval flow
- rewrite all paper workflow logic
- add database migration
- rely on string matching heuristics to detect forbidden phrases

---

## Target Stage Modes

| Mode | Stages | Behavior |
|---|---|---|
| Discussion + Dual Search | `gagasan` | Proactive discussion, contextual search, early academic search |
| Derivation | `topik` | No fresh search, derive and sharpen from existing material |
| Deep Academic Search | `tinjauan_literatur` | Proactive academic search, theory, empirical studies, research gap |
| Review / Execution | `abstrak`, `pendahuluan`, `metodologi`, `hasil`, `diskusi`, `kesimpulan`, finalization stages | Draft from approved material, present for review, no proactive search |

---

## Design Overview

F2 has two layers.

### Layer 1: Instruction Contract

Rewrite the global paper prompt and per-stage fallback instructions so the stage modes become explicit and consistent.

This layer defines:

- which stages should initiate search
- which stages should not initiate search
- what kind of search is expected
- what the assistant must do after a successful search turn

### Layer 2: Runtime Search-Turn Enforcement

Add a state-based enforcement step in the search orchestration path.

This layer checks runtime facts such as:

- search was executed in this turn
- citations or sources exist
- a composed answer exists

If those facts are true, the final response must satisfy a structural contract:

- contains a user-facing summary of actual search findings
- contains concrete next-step implications or recommendations
- is allowed to include citations and choice-card content
- is not allowed to end as a mere transitional preamble

This enforcement must be state-based, not regex-based.

---

## Instruction Layer Design

### Global Paper Prompt

Update the paper-mode general contract so it no longer applies one universal behavior to all stages.

New global behavior:

- `gagasan`: discussion-heavy and research-expansive
- `topik`: narrowing and derivation
- `tinjauan_literatur`: evidence-deepening academic synthesis
- later stages: execution and review from existing approved material

Add a positive search-turn contract:

- if search has already executed in this turn and sources are available, the assistant must respond with actual findings from those sources
- it must not respond as though the search is still pending

This closes the current gap where the prompt only says what not to say.

### Stage Fallback Instructions

Because stage instruction resolution can fall back, the critical behavior must be duplicated in fallback stage files.

#### `gagasan`

Target behavior:

- maximize discussion quality
- proactively request research when the idea still needs support
- frame search as dual-purpose:
  - context and feasibility
  - early evidence and academic grounding
- after a search turn completes, present the findings immediately

#### `topik`

Target behavior:

- do not initiate fresh web search
- derive and sharpen topic formulation from:
  - approved `gagasan`
  - existing references already attached to the session
  - approved artifacts and memory context
- if the user asks for more research, redirect the workflow conceptually to:
  - `gagasan` for early evidence gathering
  - `tinjauan_literatur` for deep academic exploration

#### `tinjauan_literatur`

Target behavior:

- proactive academic search
- deeper evidence collection than `gagasan`
- focus on:
  - frameworks
  - theories
  - empirical studies
  - contradictions
  - research gap
- completed search turns must return findings, not search promises

#### Review / Execution Stages

Target behavior:

- use approved and existing material first
- default to no proactive search
- present drafts, revisions, and review choices
- treat search as an exception, not a default pattern

---

## Runtime Enforcement Design

### Why runtime enforcement is required

Prompt-only control is not reliable enough here because:

- fallback instructions already weaken specialization
- the model has already shown non-compliance in manual testing
- the current runtime does not guard the final text after search finishes

So F2 must add a post-search response contract in code.

### Enforcement trigger

The enforcement applies only when all of these are true:

1. web search was executed in the current turn
2. citations or clean sources are available
3. compose phase produced user-facing text

This avoids interfering with non-search turns.

### Enforcement rule

On a completed search turn, final output must include:

- a concise summary of what was found
- at least one concrete implication, synthesis point, or next-step recommendation

It must not be accepted as final if it is only:

- a pre-search announcement
- a waiting message
- a promise that search will happen later
- a thin transition without substantive findings

### Enforcement mechanism

Do not use regex.

Use structured runtime signals instead:

- whether search actually ran
- whether sources exist
- whether the composed result contains substantive answer content according to deterministic checks

Possible deterministic checks can be based on structure rather than phrase matching, for example:

- minimum non-citation narrative body length after stripping citation formatting
- presence of at least one declarative findings section generated from compose payload
- fallback compose template that is generated from source summaries if the primary compose result is too thin

The design does not hardcode the exact implementation yet, but the enforcement must be deterministic and state-based.

### Preferred enforcement strategy

Use a thin validator plus safe fallback composer.

Flow:

1. primary compose runs as usual
2. runtime evaluates whether the output is substantively valid for a completed search turn
3. if valid, continue
4. if invalid, regenerate a minimal findings-first response from the already available search context and citations

This keeps the system resilient without relying on brittle pattern matching.

---

## Runtime Policy Adjustments

F2 also requires aligning stage-level search policy assumptions.

### `topik` evidence policy

Current runtime still tracks fresh search evidence for `topik` via `referensiPendukung`.

That must be revisited so `topik` no longer behaves like a search-accumulation stage.

Expected direction:

- `topik` should consume existing material, not require new search evidence as a success condition
- if support material is needed, it should come from previous hub stages or approved references already in session state

### Search-complete note behavior

Current routing can insert notes like "Search completed", but that only affects prompt context.

F2 requires a stronger guarantee:

- once search is complete in a turn, the user-facing answer must behave as post-search synthesis, not pre-search transition

---

## Files in Scope

### Instruction layer

- `src/lib/ai/paper-mode-prompt.ts`
- `src/lib/ai/paper-stages/foundation.ts`
- `src/lib/ai/paper-stages/core.ts`
- `src/lib/ai/paper-stages/results.ts`
- `src/lib/ai/paper-stages/finalization.ts`

### Runtime layer

- `src/app/api/chat/route.ts`
- `src/lib/ai/web-search/orchestrator.ts`
- possibly `src/lib/ai/paper-search-helpers.ts` or adjacent helpers if stage evidence logic needs to move

### Tests

At minimum, F2 should add or update tests for:

- stage-mode contract
- `topik` no-search policy
- completed search turn must produce substantive findings output
- no regression for non-search turns

---

## Risks

1. Over-enforcement could make valid short search answers fail unnecessarily.
2. If enforcement is too weak, the screenshot bug can still leak through.
3. `topik` policy changes may affect existing assumptions in search-required heuristics.
4. Instruction and runtime layers must stay aligned or the model will receive contradictory guidance.

---

## Acceptance Criteria

F2 is complete when all of these are true:

1. `gagasan` behaves as the main discussion and research hub.
2. `topik` does not initiate fresh search by default.
3. `tinjauan_literatur` performs deeper academic search behavior than `gagasan`.
4. later stages default to execution/review using approved material
5. a successful search turn cannot end in a mere transition or waiting message
6. enforcement is implemented without regex

---

## Implementation Notes for Next Step

The next artifact after this design should be an implementation plan, not code.

That plan should break F2 into at least:

1. prompt and stage instruction rewrite
2. runtime search-turn validator design
3. `topik` search-policy alignment
4. regression tests

Only after that plan is approved should code changes begin.
