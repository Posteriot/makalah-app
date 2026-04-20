# Makalahapp Harness V1 State Machine

## Purpose

This document defines the concrete v1 workflow state machine for the makalahapp harness.

Its role is to establish the legal movement rules for the harness before implementation begins. The state machine is the central logic layer connecting:
- chat entry
- durable orchestration
- artifact mutation
- user decisions
- verification
- completion

This document should be treated as the execution-law reference for v1.

## Audit Status

This document was audited against:
- the already-audited `v1 blueprint`
- the already-audited `v1 component contracts`
- `Codex` references for instruction layering, approvals, sandbox posture, and runtime-visible policy
- `Claude Code` references for permissions, hooks, and explicit execution controls

Audit result:
- The state machine remains directionally correct.
- Two material corrections were required:
  - `paused_for_user`, `failed`, and `completed` should not be modeled as normal workflow domain stages alongside `intake -> ready_for_user`
  - the clarification path must not ambiguously suggest bypassing the required pause when a material user decision is actually needed
- Additional correction from the new references:
  - instruction precedence and runtime policy evaluation should affect guards and pause/failure outcomes, but should not become separate workflow stages
  - approval and execution-boundary checks must be represented as transition-law inputs, not as informal side behavior
- The corrected model keeps:
  - workflow domain stages for task progression
  - workflow/run status for pause and terminal conditions

## Why State Machine Comes First

The v1 component contracts already define responsibilities and boundaries, but they do not yet define:
- what stages exist
- when transitions are legal
- what blocks progression
- when the system must pause
- when the system may complete

Without a state machine, the harness would still have components but no strict behavioral law.

## State Machine Design Principles

The v1 state machine must satisfy these rules:

1. State transitions must be driven by structured state and runtime guards, never by keyword heuristics.
2. The model may propose actions, but the orchestrator and guards decide whether a transition is valid.
3. Completion must be blocked unless verification passes.
4. Important ambiguity must force an explicit user decision instead of model guessing.
5. Artifact mutation must only happen in stages where mutation is allowed.
6. Instruction precedence and runtime policy must be resolved before guarded actions are evaluated.
7. The state machine must be simple enough for v1, but strict enough to prevent chaotic execution.

## Top-Level State Model

The v1 harness should manage these state domains:

- `workflowState`
- `artifactState`
- `runState`
- `decisionState`
- `policyState`
- `verificationState`

The workflow state machine is the master coordinator. The other states are subordinate and must remain consistent with it.

`policyState` in v1 does not need to be large. It only needs to carry enough runtime truth to answer:
- whether the current action requires approval
- what execution boundary applies to a mutation-capable action
- whether a run is currently blocked on an unresolved approval

## Workflow Stages

Recommended v1 stages:

1. `intake`
2. `clarification`
3. `planning`
4. `drafting`
5. `revision`
6. `verification`
7. `ready_for_user`

These are workflow domain stages, not run terminal states.

## Stage Definitions

### 1. `intake`

Meaning:
- the harness has accepted a user message
- the system is identifying the request and current session context

Allowed actions:
- load session state
- load artifact state
- classify request intent
- determine whether clarification is needed

Artifact mutation:
- not allowed

Exit conditions:
- move to `clarification` if ambiguity is material
- move to `planning` if enough context exists
- set run/workflow status to `failed` if entry or state load fails irrecoverably

### 2. `clarification`

Meaning:
- the system has identified a material ambiguity or decision that should not be guessed

Allowed actions:
- prepare structured user questions
- prepare recommendation for the user
- pause execution for user input

Artifact mutation:
- not allowed

Exit conditions:
- set run/workflow status to `paused` when a user decision is requested
- move to `planning` only after the required clarification has been received and persisted
- set run/workflow status to `failed` if clarification flow becomes invalid

### 3. `planning`

Meaning:
- the system is deciding the next legal workflow move using the current state, user intent, and artifact situation

Allowed actions:
- analyze current workflow position
- identify required artifact operations
- decide whether drafting, revision, or verification should come next

Artifact mutation:
- not allowed by default

Exit conditions:
- move to `drafting` if new or significantly reworked content is needed
- move to `revision` if an existing artifact should be refined
- move to `verification` if the artifact is ready to be checked
- move to `clarification` if planning exposes unresolved ambiguity
- set run/workflow status to `paused` if the next legal action is blocked on an unresolved approval
- set run/workflow status to `failed` if planning cannot establish a legal next move

### 4. `drafting`

Meaning:
- the system is generating or materially extending artifact content

Allowed actions:
- create artifact sections
- append structured content
- produce initial artifact versions

Artifact mutation:
- allowed

Exit conditions:
- move to `verification` after drafting work is complete for the current pass
- move to `clarification` if drafting reveals blocked ambiguity
- set run/workflow status to `paused` if drafting is blocked by an approval requirement that cannot be auto-resolved
- set run/workflow status to `failed` if drafting operations fail irrecoverably

### 5. `revision`

Meaning:
- the system is modifying an existing artifact in a targeted way

Allowed actions:
- update artifact sections
- replace or restructure content
- apply constrained edits

Artifact mutation:
- allowed

Exit conditions:
- move to `verification` after revision work is complete for the current pass
- move to `clarification` if revision requires user choice
- set run/workflow status to `paused` if revision is blocked by an approval requirement that cannot be auto-resolved
- set run/workflow status to `failed` if revision operations fail irrecoverably

### 6. `verification`

Meaning:
- the system is checking whether current artifact and workflow state satisfy completion rules for the current pass

Allowed actions:
- run state consistency checks
- run artifact contract checks
- decide whether the result is eligible to move forward

Artifact mutation:
- not allowed during the verification step itself

Exit conditions:
- move to `ready_for_user` if verification passes and no further work is required
- move to `revision` if verification fails but the issue is repairable
- move to `drafting` if verification shows missing required content
- move to `clarification` if verification identifies a user-blocked decision
- set run/workflow status to `failed` if verification itself cannot produce a valid result

### 7. `ready_for_user`

Meaning:
- the artifact and workflow state are valid for presentation back to the user

Allowed actions:
- prepare final response
- expose artifact result
- present verification-backed completion state

Artifact mutation:
- not allowed unless the workflow is explicitly reopened by a new user request

Exit conditions:
- set run/workflow status to `completed` when final response is persisted and run closes
- move to `planning` if a new user instruction reopens the workflow

## Legal Transitions

The legal v1 transition map should be:

- `intake -> clarification`
- `intake -> planning`

- `clarification -> planning`

- `planning -> drafting`
- `planning -> revision`
- `planning -> verification`
- `planning -> clarification`

- `drafting -> verification`
- `drafting -> clarification`

- `revision -> verification`
- `revision -> clarification`

- `verification -> ready_for_user`
- `verification -> drafting`
- `verification -> revision`
- `verification -> clarification`

- `ready_for_user -> planning`

## Forbidden Transitions

The following transitions should be explicitly illegal in v1:

- `intake -> drafting`
- `intake -> revision`
- `intake -> ready_for_user`
- `clarification -> drafting`
- `clarification -> revision`
- `planning -> ready_for_user`
- `drafting -> ready_for_user`
- `revision -> ready_for_user`
- `verification -> completed`

Why they are forbidden:
- they bypass required planning or verification
- they create direct paths to completion without control gates

## State Transition Guards

Each transition must be evaluated by runtime guards.

### Guard Group A: Entry Guards

Used before leaving `intake`.

Checks:
- session and chat are valid
- current workflow state can be loaded
- active artifact linkage is valid if one exists
- current run ownership is legal

Failure path:
- set run/workflow status to `failed`

### Guard Group B: Clarification Guards

Used before entering or leaving `clarification`.

Checks:
- ambiguity is material, not trivial
- there is no conflicting active pending decision
- the question payload is structurally valid

Failure path:
- set run/workflow status to `failed`

### Guard Group C: Planning Guards

Used before leaving `planning`.

Checks:
- there is a legal next stage
- required context exists
- no unresolved blocking decision remains
- current artifact state is compatible with the proposed next step
- instruction stack has been resolved for the step

Failure path:
- transition to `clarification` or set run/workflow status to `failed`, depending on whether user input can unblock the issue

### Guard Group D: Mutation Guards

Used before entering `drafting` or `revision`.

Checks:
- artifact mutation is allowed in the current workflow situation
- overwrite policy is satisfied
- no pending decision blocks mutation
- artifact version reference is still valid
- runtime approval requirement has been evaluated
- execution boundary for the requested mutation has been resolved

Failure path:
- transition to `clarification`, set run/workflow status to `paused`, or set run/workflow status to `failed`, depending on whether the block is a user-resolvable approval, a recoverable ambiguity, or a terminal policy violation

### Guard Group E: Verification Guards

Used before leaving `verification`.

Checks:
- verification result exists
- verification findings are structurally valid
- completion eligibility is explicit

Failure path:
- set run/workflow status to `failed`

### Guard Group F: Completion Guards

Used before entering `ready_for_user` and before marking the run as `completed`.

Checks:
- verification passed
- no pending user decision remains
- artifact state is internally consistent
- latest workflow state is persisted

Failure path:
- return to `revision`, `drafting`, or `clarification`, depending on the cause

## Artifact Mutation Rules by Stage

To keep the harness strict, artifact mutation should be allowed only in:
- `drafting`
- `revision`

Artifact mutation should be forbidden in:
- `intake`
- `clarification`
- `planning`
- `verification`
- `ready_for_user`

This rule should be enforced by the orchestrator and tool-layer mutation guards.

In addition:
- entering a mutation-allowed stage does not itself authorize mutation
- each mutation-capable action must still pass runtime approval and execution-boundary evaluation

## User Decision Rules

The paused state is not a generic waiting room. It should only exist when:
- a structured pending decision has been created
- the decision is material to legal progression

Rules:
- only one active blocking decision per execution lane
- user response must reference the active decision
- decision resolution must be persisted before transitioning back to `planning`
- approval prompts should reuse the same blocking-decision discipline rather than creating a separate ad hoc waiting state

If the user declines:
- the orchestrator must decide whether the workflow can continue conservatively
- otherwise set run/workflow status to `failed` with explicit reason

## Verification Rules

Verification is mandatory before `ready_for_user`.

The verification stage must decide among these outcomes:
- `pass`
- `fail_repairable`
- `fail_missing_content`
- `fail_user_blocked`
- `fail_irrecoverable`

Recommended mapping:
- `pass -> ready_for_user`
- `fail_repairable -> revision`
- `fail_missing_content -> drafting`
- `fail_user_blocked -> clarification`
- `fail_irrecoverable -> run/workflow status failed`

This mapping should be deterministic at the orchestrator level.

## Run Status vs Workflow Stage

These must stay separate.

Workflow stage answers:
- where in the task lifecycle the harness currently is

Run/workflow status answers:
- whether the current run is active, paused, completed, or failed

Recommended run statuses:
- `running`
- `paused`
- `completed`
- `failed`
- `aborted`

Suggested relationship:
- if stage is `clarification` and a blocking decision has been emitted, run status should be `paused`
- if stage is `planning`, `drafting`, or `revision` and a required approval has been emitted, run status should also be `paused`
- if the run finishes cleanly from `ready_for_user`, run status should be `completed`
- if a guard or execution failure is terminal, run status should be `failed`
- all other active stages typically imply run status `running`

## Reopen Rules

When a new user message arrives after `ready_for_user` or `completed`, the harness should not pretend the old run is still live.

Recommended policy:
- create a new run
- reuse persisted workflow and artifact state
- re-enter from `planning`

Why:
- the user is reopening work on an already completed or user-ready artifact state
- `planning` is the correct controlled re-entry point

## Example State Paths

### Path A: Straightforward Flow

`intake -> planning -> drafting -> verification -> ready_for_user [run completed]`

Use when:
- user request is clear
- new or expanded content is needed
- verification passes directly

### Path B: Clarification First

`intake -> clarification [run paused] -> planning -> drafting -> verification -> ready_for_user [run completed]`

Use when:
- the request contains material ambiguity

### Path C: Verification Finds Repairable Problems

`intake -> planning -> revision -> verification -> revision -> verification -> ready_for_user [run completed]`

Use when:
- the artifact exists but does not yet meet completion requirements

### Path D: Verification Requires More Content

`intake -> planning -> drafting -> verification -> drafting -> verification -> ready_for_user [run completed]`

Use when:
- verification identifies missing required content

### Path E: Irrecoverable Failure

`intake -> planning -> revision [run failed]`

Use when:
- the system cannot legally or safely continue

## Minimum Workflow State Fields

The state machine requires at least:

- `workflowStage`
- `workflowStatus`
- `currentArtifactId`
- `pendingDecisionId`
- `lastVerificationStatus`
- `lastTransitionReason`
- `lastTransitionAt`

Optional but useful:
- `reopenCount`
- `iterationCount`
- `lastRepairPath`

## Orchestrator Responsibilities Under This State Machine

The orchestrator must:
- evaluate guards before every transition
- record the requested transition and the applied transition
- reject forbidden transitions explicitly
- prevent mutation tools from running in forbidden stages
- prevent completion without verification

The orchestrator must not:
- infer stage progression from model free text alone
- allow direct stage jumps outside the legal map

## Final Recommendation

The v1 state machine should remain strict and small.

The correct center of harness logic is:
- controlled stage progression
- explicit pause conditions
- mutation only in allowed stages
- verification-gated completion

This state machine should be treated as the next-level reference above the component contracts and below future event/data-contract detail.
