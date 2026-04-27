# Migration Risks and Rollout Strategy

## Purpose

This document identifies the main risks of moving makalahapp toward a model-led, tool-first architecture and proposes a safe rollout strategy.

## Main Risks

### Risk 1: model loses implicit knowledge previously supplied by enforcers

Description:

- if domain enforcers are removed before explicit tool/state guidance exists, the model may choose invalid or incomplete actions more often

Mitigation:

- add `getStageCapabilities` early
- keep prompts contract-oriented during transition
- preserve verification blockers

### Risk 2: legality regressions if wrapper logic is removed before backend guards are complete

Description:

- some legality today may be partially protected in tool wrappers or rescue flows

Mitigation:

- audit each domain tool before simplifying wrapper logic
- move missing legality checks into backend first

### Risk 3: hidden product dependencies on current sequence behavior

Description:

- UI behavior, metrics, and downstream assumptions may rely on same-turn sequencing patterns that are currently enforced indirectly

Mitigation:

- document every same-turn dependency
- test validation panel, choice card, artifact panel, and rewind flows explicitly

### Risk 4: search path regressions

Description:

- search currently has specialized orchestration, persistence, billing, and message-saving behavior

Mitigation:

- treat search as a phased migration
- first expose explicit tool semantics
- only later collapse orchestration branching where safe

### Risk 5: prompt drift during migration

Description:

- prompts may continue to issue choreography rules after policy removal

Mitigation:

- rewrite prompts after the new tools and backend contracts are in place
- keep one source of truth for allowed actions

### Risk 6: observability blind spots

Description:

- a thinner harness can accidentally lose useful audit detail if event semantics are not updated

Mitigation:

- preserve event emission around new explicit domain actions
- prefer explicit action logs over inferred chain logs

## Rollout Strategy

### Phase 1: make legality visible

Goals:

- add `getStageCapabilities`
- expose missing domain tools
- document allowed and blocked actions explicitly

Do not remove:

- enforcers yet

### Phase 2: harden backend contracts

Goals:

- ensure lifecycle legality is enforced by backend mutations
- remove legality gaps that currently rely on wrapper behavior

Do not remove:

- tool wrappers yet, except small cleanup

### Phase 3: simplify tool wrappers

Goals:

- make tool handlers thinner
- remove hidden rescue from harness-side helpers
- make tool results explicit and corrective

### Phase 4: remove policy choreography

Goals:

- remove `universalReactiveEnforcer`
- remove `draftingChoiceArtifactEnforcer`
- remove `revisionChainEnforcer`
- simplify `composePrepareStep`
- redefine execution boundaries to runtime-only posture

### Phase 5: simplify prompts

Goals:

- rewrite prompt doctrine from imperative sequences into:
  - state summary
  - allowed actions
  - blocked actions
  - success criteria

### Phase 6: search path convergence

Goals:

- reduce specialized orchestration branching where practical
- keep billing and persistence intact

## Safe Order of Change

1. Add missing read and domain tools.
2. Tighten backend legality.
3. Thin tool wrappers.
4. Remove policy enforcers.
5. Rewrite prompts.
6. Revisit search orchestration shape.

## Testing Focus

### Must-test workflow cases

- drafting to validation happy path
- pending validation to revision
- artifact revision after requestRevision
- choice card cancellation
- rewind flow
- unapprove flow
- daftar pustaka compile preview and persist
- search turns followed by save turns

### Must-test architecture cases

- pause/resume still works
- run and step persistence still coherent
- event logs remain understandable
- verification blockers still fire correctly

## Best Recommendation

Do not start by deleting policy logic.

Start by adding explicit capability visibility and missing domain tools. That creates the conditions for safe policy removal instead of optimistic breakage.
